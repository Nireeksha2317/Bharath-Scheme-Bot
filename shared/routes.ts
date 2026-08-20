import { z } from 'zod';
import { insertSchemeSchema, schemes } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  schemes: {
    list: {
      method: 'GET' as const,
      path: '/api/schemes' as const,
      input: z.object({
        category: z.string().optional(),
        state: z.string().optional(),
        search: z.string().optional(),
        source: z.string().optional(),
        deviceId: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof schemes.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/schemes/:id' as const,
      responses: {
        200: z.custom<typeof schemes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  profile: {
    get: {
      method: 'GET' as const,
      path: '/api/profile' as const,
      input: z.object({
        deviceId: z.string(),
      }).optional(),
      responses: {
        200: z.custom<typeof import('./schema').userProfiles.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    update: {
      method: 'POST' as const,
      path: '/api/profile' as const,
      input: z.object({
        deviceId: z.string(),
        profile: z.record(z.any()), // We will properly type this in the server
      }),
      responses: {
        200: z.custom<typeof import('./schema').userProfiles.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  savedSchemes: {
    list: {
      method: 'GET' as const,
      path: '/api/saved-schemes' as const,
      input: z.object({
        deviceId: z.string(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          saved: z.custom<typeof import('./schema').savedSchemes.$inferSelect>(),
          scheme: z.custom<typeof import('./schema').schemes.$inferSelect>()
        })),
        404: errorSchemas.notFound,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/saved-schemes' as const,
      input: z.object({
        deviceId: z.string(),
        schemeId: z.number(),
      }),
      responses: {
        200: z.custom<typeof import('./schema').savedSchemes.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    remove: {
      method: 'DELETE' as const,
      path: '/api/saved-schemes/:schemeId' as const,
      input: z.object({
        deviceId: z.string(),
      }).optional(),
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      }
    }
  },
  applications: {
    list: {
      method: 'GET' as const,
      path: '/api/applications' as const,
      input: z.object({
        deviceId: z.string(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          app: z.custom<typeof import('./schema').applications.$inferSelect>(),
          scheme: z.custom<typeof import('./schema').schemes.$inferSelect>()
        })),
        404: errorSchemas.notFound,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/applications' as const,
      input: z.object({
        deviceId: z.string(),
        schemeId: z.number(),
      }),
      responses: {
        200: z.custom<typeof import('./schema').applications.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/applications/:id' as const,
      input: z.object({
        deviceId: z.string(),
        status: z.string(),
      }),
      responses: {
        200: z.custom<typeof import('./schema').applications.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  chat: {
    send: {
      method: 'POST' as const,
      path: '/api/chat' as const,
      input: z.object({
        message: z.string(),
        language: z.string().default('en'),
        deviceId: z.string().optional(),
      }),
      responses: {
        200: z.object({
          response: z.string(),
          intent: z.string(),
          schemes: z.array(z.custom<typeof schemes.$inferSelect>()).optional(),
          suggestedQuestions: z.array(z.string()).optional(),
        }),
        400: errorSchemas.validation,
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type Scheme = z.infer<typeof api.schemes.get.responses[200]>;
export type ChatResponse = z.infer<typeof api.chat.send.responses[200]>;
