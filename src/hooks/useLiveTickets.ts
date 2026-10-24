"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { MeResponse } from "@/shared/dto";

export type LiveConnectionStatus = "connected" | "connecting" | "offline";

export function useLiveTickets(): { status: LiveConnectionStatus } {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveConnectionStatus>("connecting");

  const { data: meData } = useQuery<MeResponse | null>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api<MeResponse>("/api/me");
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const rawChannels = meData?.realtime?.channels;
  const channelListKey = rawChannels && rawChannels.length > 0 ? [...rawChannels].sort().join(",") : "";

  useEffect(() => {
    if (!channelListKey) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    const channelNames = channelListKey.split(",").filter(Boolean);
    const activeChannels = channelNames.map((chName) => {
      const channel = supabase.channel(chName);
      channel
        .on("broadcast", { event: "invalidate" }, (event) => {
          const payload = event.payload as { type?: string; ticketId?: string } | undefined;
          if (payload?.ticketId) {
            void queryClient.invalidateQueries({ queryKey: ["ticket", payload.ticketId] });
            void queryClient.invalidateQueries({ queryKey: ["adminTicket", payload.ticketId] });
          }
          void queryClient.invalidateQueries({ queryKey: ["tickets"] });
          void queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
        })
        .subscribe((subStatus) => {
          if (subStatus === "SUBSCRIBED") {
            setStatus("connected");
          } else if (subStatus === "TIMED_OUT" || subStatus === "CHANNEL_ERROR") {
            setStatus("offline");
          } else if (subStatus === "CLOSED") {
            setStatus("connecting");
          }
        });

      return channel;
    });

    const handleOnline = () => {
      setStatus("connecting");
    };
    const handleOffline = () => {
      setStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      for (const ch of activeChannels) {
        void supabase.removeChannel(ch);
      }
    };
  }, [channelListKey, queryClient]);

  const effectiveStatus = channelListKey ? status : "offline";

  return { status: effectiveStatus };
}
