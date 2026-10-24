/**
 * Complete OpenAPI 3.0.3 specification for the BookLeaf Author Support & Communication Portal.
 * Covers all endpoints, request/response bodies, role requirements, and error responses.
 */
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "BookLeaf Author Support Portal API",
    version: "1.0.0",
    description: `
The BookLeaf Author Support Portal REST API powers both author-facing workflows (viewing published titles, tracking sales & royalty statements, raising support tickets) and admin support operations (urgency-sorted ticket queue, ticket assignment, status updates, internal notes, AI-powered auto-classification, and AI-drafted replies).

### Authentication & Sessions
- **Mechanism**: Session cookies managed by Auth.js v5 (\`authjs.session-token\` or \`__Secure-authjs.session-token\`).
- **Sign In**: POST credentials (\`email\`, \`password\`, \`csrfToken\`) to \`/api/auth/callback/credentials\`. The server validates credentials with bcrypt and returns an HTTP-only session cookie.
- **CSRF Protection**: Obtain a token from \`GET /api/auth/csrf\` before posting credentials.
- **Role-Based Access Control (RBAC)**:
  - **AUTHOR**: Limited to personal profile, own books, and personal tickets.
  - **ADMIN**: Access to the cross-author ticket queue, ticket management, internal notes, AI triage, and AI drafting.
    `.trim(),
    contact: {
      name: "BookLeaf Author Support Engineering",
      url: "https://bookleafpublishing.com",
    },
  },
  servers: [
    {
      url: "/",
      description: "Current host / environment",
    },
  ],
  security: [
    {
      cookieAuth: [],
    },
  ],
  paths: {
    "/api/health": {
      get: {
        summary: "Service Health & Liveness",
        description: "Returns operational status, database connectivity, and whether AI capabilities are active. Public endpoint.",
        operationId: "getHealth",
        security: [],
        responses: {
          "200": {
            description: "Service is healthy and database is connected",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    timestamp: { type: "string", format: "date-time" },
                    aiEnabled: { type: "boolean", example: true },
                    database: { type: "string", example: "connected" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/me": {
      get: {
        summary: "Current Authenticated User Profile",
        description: "Returns profile details, role, and Supabase Realtime broadcast channel key for the signed-in session.",
        operationId: "getCurrentUser",
        responses: {
          "200": {
            description: "Authenticated user profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string", example: "usr_author_1" },
                        email: { type: "string", format: "email", example: "priya.sharma@email.com" },
                        name: { type: "string", example: "Priya Sharma" },
                        role: { type: "string", enum: ["AUTHOR", "ADMIN"], example: "AUTHOR" },
                        authorId: { type: "string", nullable: true, example: "AUTH001" },
                        realtimeKey: { type: "string", format: "uuid" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/me/books": {
      get: {
        summary: "Author Books & Royalty Summary",
        description: "Retrieves the signed-in author's books, lifetime copies sold, earnings, pending balances, and next payout dates. AUTHOR only.",
        operationId: "getMyBooks",
        responses: {
          "200": {
            description: "List of books owned by the author and royalty totals summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    books: {
                      type: "array",
                      items: { $ref: "#/components/schemas/BookDto" },
                    },
                    summary: { $ref: "#/components/schemas/RoyaltySummaryDto" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/tickets": {
      get: {
        summary: "List Author's Support Tickets",
        description: "Lists all support tickets created by the signed-in author, newest first. AUTHOR only.",
        operationId: "listAuthorTickets",
        responses: {
          "200": {
            description: "Array of author's support tickets",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tickets: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TicketSummaryDto" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        summary: "Create a Support Ticket",
        description: "Submits a new query. Returns HTTP 201 immediately while triggering non-blocking background AI triage. AUTHOR only.",
        operationId: "createTicket",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTicketInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Ticket successfully created",
            headers: {
              Location: {
                schema: { type: "string" },
                description: "URI of the newly created ticket",
              },
            },
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ticket: { $ref: "#/components/schemas/TicketSummaryDto" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/tickets/{id}": {
      get: {
        summary: "Author Ticket Detail & Conversation",
        description: "Retrieves complete ticket conversation and message history. Internal team notes are strictly excluded. AUTHOR only.",
        operationId: "getAuthorTicketDetail",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Unique ticket ID",
          },
        ],
        responses: {
          "200": {
            description: "Ticket details and public messages",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ticket: { $ref: "#/components/schemas/AuthorTicketDto" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/tickets/{id}/messages": {
      post: {
        summary: "Post Author Follow-up Message",
        description: "Adds an author message to the conversation. If ticket was RESOLVED, automatically reopens it. AUTHOR only.",
        operationId: "addAuthorMessage",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["body"],
                properties: {
                  body: { type: "string", minLength: 1, maxLength: 5000 },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Message posted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { $ref: "#/components/schemas/TicketMessageDto" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { description: "Conflict: Ticket is CLOSED and cannot accept new messages." },
        },
      },
    },
    "/api/admin/tickets": {
      get: {
        summary: "Admin Ticket Queue",
        description: "Returns paginated support tickets with filters (status, category, priority, assignee, date range, search) and urgency sorting. ADMIN only.",
        operationId: "getAdminTicketQueue",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["ALL", "UNRESOLVED", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] } },
          { name: "category", in: "query", schema: { type: "string", enum: ["ROYALTY_PAYMENTS", "ISBN_METADATA", "PRINTING_QUALITY", "DISTRIBUTION_AVAILABILITY", "BOOK_STATUS_PRODUCTION", "GENERAL_INQUIRY"] } },
          { name: "priority", in: "query", schema: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] } },
          { name: "assignee", in: "query", schema: { type: "string", description: "'me', 'unassigned', or specific user ID" } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
          { name: "q", in: "query", schema: { type: "string", description: "Search query across subject, description, author name, or book title" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": {
            description: "Paginated queue list with count totals",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tickets: { type: "array", items: { $ref: "#/components/schemas/AdminQueueItemDto" } },
                    total: { type: "integer" },
                    page: { type: "integer" },
                    pageSize: { type: "integer" },
                    totalPages: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/admin/tickets/{id}": {
      get: {
        summary: "Admin Ticket Detail",
        description: "Returns full ticket conversation, author profile, referenced book facts, other author books, and private internal notes. ADMIN only.",
        operationId: "getAdminTicketDetail",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Full ticket detail with admin context",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ticket: { $ref: "#/components/schemas/AdminTicketDetailDto" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        summary: "Update Ticket Controls (Status, Category, Priority, Assignee)",
        description: "Updates ticket status, category, priority, or assigned admin. Category or priority changes mark source as MANUAL. ADMIN only.",
        operationId: "updateAdminTicket",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTicketInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Ticket successfully updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ticket: { $ref: "#/components/schemas/AdminTicketDetailDto" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/admin/tickets/{id}/messages": {
      post: {
        summary: "Post Admin Reply to Author",
        description: "Sends an official support reply to the author. Automatically advances ticket status from OPEN to IN_PROGRESS. Records if reply derived from AI draft. ADMIN only.",
        operationId: "postAdminReply",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateAdminMessageInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Reply successfully delivered",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { $ref: "#/components/schemas/TicketMessageDto" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/admin/tickets/{id}/notes": {
      post: {
        summary: "Add Private Internal Note",
        description: "Creates an internal team note visible strictly to BookLeaf staff. Authors never see internal notes. ADMIN only.",
        operationId: "addInternalNote",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["body"],
                properties: {
                  body: { type: "string", minLength: 1, maxLength: 5000 },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Internal note saved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    note: { $ref: "#/components/schemas/InternalNoteDto" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/admin/tickets/{id}/classify": {
      post: {
        summary: "Trigger Ticket Re-Triage",
        description: "Manually re-runs auto-classification and priority assignment. Uses Gemini when enabled or keyword heuristics fallback. ADMIN only.",
        operationId: "reclassifyTicket",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Triage result with category, priority, source, and reasoning",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TriageResultDto" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/admin/tickets/{id}/draft": {
      get: {
        summary: "Get AI-Drafted Reply",
        description: "Retrieves a cached AI draft or generates a fresh draft grounded in policy context and calculated author facts. Supports ?regenerate=true. ADMIN only.",
        operationId: "getTicketAiDraft",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "regenerate", in: "query", schema: { type: "boolean", default: false }, description: "Force a new draft generation bypassing database cache" },
        ],
        responses: {
          "200": {
            description: "AI-drafted reply content and cache status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    draft: { type: "string" },
                    cached: { type: "boolean" },
                    model: { type: "string" },
                    basedOnMessageCount: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "503": {
            description: "AI service unavailable (e.g. rate limit, disabled, or outage). UI renders manual reply fallback.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/openapi": {
      get: {
        summary: "OpenAPI 3.0 Specification JSON",
        description: "Returns the machine-readable OpenAPI specification for the BookLeaf Portal. Public endpoint.",
        operationId: "getOpenApiSpec",
        security: [],
        responses: {
          "200": {
            description: "OpenAPI specification JSON",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "authjs.session-token",
        description: "HTTP-only session cookie returned by POST /api/auth/callback/credentials upon successful sign-in.",
      },
    },
    responses: {
      Unauthorized: {
        description: "Unauthorized — missing or invalid session cookie",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Forbidden: {
        description: "Forbidden — user lacks necessary permissions or role",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ValidationError: {
        description: "Bad Request — invalid input fields",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "UNAUTHORIZED" },
              message: { type: "string", example: "Please sign in to continue." },
              details: { type: "object", nullable: true },
            },
          },
        },
      },
      CreateTicketInput: {
        type: "object",
        required: ["subject", "description"],
        properties: {
          bookId: { type: "string", nullable: true, example: "BK001", description: "Null for account-level inquiries" },
          subject: { type: "string", minLength: 3, maxLength: 120 },
          description: { type: "string", minLength: 10, maxLength: 2000 },
          attachmentName: { type: "string", nullable: true },
        },
      },
      UpdateTicketInput: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] },
          category: { type: "string", enum: ["ROYALTY_PAYMENTS", "ISBN_METADATA", "PRINTING_QUALITY", "DISTRIBUTION_AVAILABILITY", "BOOK_STATUS_PRODUCTION", "GENERAL_INQUIRY"] },
          priority: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
          assigneeId: { type: "string", nullable: true },
        },
      },
      CreateAdminMessageInput: {
        type: "object",
        required: ["body"],
        properties: {
          body: { type: "string", minLength: 1, maxLength: 5000 },
          usedAiDraft: { type: "boolean", default: false },
        },
      },
      TicketSummaryDto: {
        type: "object",
        properties: {
          id: { type: "string" },
          subject: { type: "string" },
          status: { type: "string", enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] },
          book: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string" },
              title: { type: "string" },
            },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuthorTicketDto: {
        type: "object",
        properties: {
          id: { type: "string" },
          subject: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] },
          attachmentName: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          resolvedAt: { type: "string", format: "date-time", nullable: true },
          book: {
            type: "object",
            nullable: true,
            properties: { id: { type: "string" }, title: { type: "string" } },
          },
          messages: {
            type: "array",
            items: { $ref: "#/components/schemas/TicketMessageDto" },
          },
        },
      },
      AdminQueueItemDto: {
        type: "object",
        properties: {
          id: { type: "string" },
          subject: { type: "string" },
          status: { type: "string" },
          category: { type: "string", nullable: true },
          categorySource: { type: "string", enum: ["AI", "FALLBACK", "MANUAL"], nullable: true },
          priority: { type: "string", nullable: true },
          prioritySource: { type: "string", enum: ["AI", "FALLBACK", "MANUAL"], nullable: true },
          priorityRank: { type: "integer" },
          aiConfidence: { type: "number", nullable: true },
          aiReasoning: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          author: {
            type: "object",
            properties: { id: { type: "string" }, name: { type: "string" }, email: { type: "string" } },
          },
          book: {
            type: "object",
            nullable: true,
            properties: { id: { type: "string" }, title: { type: "string" } },
          },
          assignee: {
            type: "object",
            nullable: true,
            properties: { id: { type: "string" }, name: { type: "string" } },
          },
        },
      },
      AdminTicketDetailDto: {
        type: "object",
        properties: {
          id: { type: "string" },
          subject: { type: "string" },
          description: { type: "string" },
          status: { type: "string" },
          category: { type: "string", nullable: true },
          categorySource: { type: "string", nullable: true },
          priority: { type: "string", nullable: true },
          prioritySource: { type: "string", nullable: true },
          aiConfidence: { type: "number", nullable: true },
          aiReasoning: { type: "string", nullable: true },
          attachmentName: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          resolvedAt: { type: "string", format: "date-time", nullable: true },
          author: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              city: { type: "string" },
              joinedDate: { type: "string" },
            },
          },
          book: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              isbn: { type: "string" },
              genre: { type: "string" },
              status: { type: "string" },
              mrp: { type: "integer", nullable: true },
              copiesSold: { type: "integer" },
              royaltyEarned: { type: "integer" },
              royaltyPaid: { type: "integer" },
              royaltyPending: { type: "integer" },
            },
          },
          messages: { type: "array", items: { $ref: "#/components/schemas/TicketMessageDto" } },
          notes: { type: "array", items: { $ref: "#/components/schemas/InternalNoteDto" } },
        },
      },
      TicketMessageDto: {
        type: "object",
        properties: {
          id: { type: "string" },
          body: { type: "string" },
          senderRole: { type: "string", enum: ["AUTHOR", "ADMIN"] },
          senderName: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          usedAiDraft: { type: "boolean", default: false },
        },
      },
      InternalNoteDto: {
        type: "object",
        properties: {
          id: { type: "string" },
          adminId: { type: "string" },
          adminName: { type: "string" },
          body: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      TriageResultDto: {
        type: "object",
        properties: {
          ticketId: { type: "string" },
          category: { type: "string" },
          categorySource: { type: "string", enum: ["AI", "FALLBACK", "MANUAL"] },
          priority: { type: "string" },
          prioritySource: { type: "string", enum: ["AI", "FALLBACK", "MANUAL"] },
          priorityRank: { type: "integer" },
          confidence: { type: "number" },
          reasoning: { type: "string" },
        },
      },
      BookDto: {
        type: "object",
        properties: {
          id: { type: "string", example: "BK001" },
          title: { type: "string", example: "Whispers in the Wind" },
          isbn: { type: "string", example: "978-93-12345-01-2" },
          genre: { type: "string", example: "Fiction / Romance" },
          publicationDate: { type: "string", format: "date", nullable: true },
          status: { type: "string", example: "Published & Live" },
          mrp: { type: "integer", nullable: true, example: 299 },
          copiesSold: { type: "integer", example: 120 },
          royaltyEarned: { type: "integer", example: 5400 },
          royaltyPaid: { type: "integer", example: 2854 },
          royaltyPending: { type: "integer", example: 2546 },
          lastPayoutDate: { type: "string", format: "date", nullable: true },
          printPartner: { type: "string", nullable: true },
          availableOn: { type: "array", items: { type: "string" } },
        },
      },
      RoyaltySummaryDto: {
        type: "object",
        properties: {
          totalEarned: { type: "integer" },
          totalPaid: { type: "integer" },
          totalPending: { type: "integer" },
          belowThreshold: { type: "boolean" },
          nextPayout: {
            type: "object",
            properties: {
              payoutBy: { type: "string" },
              quarterLabel: { type: "string" },
            },
          },
        },
      },
    },
  },
};
