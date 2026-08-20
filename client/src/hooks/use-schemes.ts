import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type ChatResponse, type Scheme } from "@shared/routes";
import { z } from "zod";
import { getDeviceId } from "./use-profile";

// ============================================
// Schemes Hooks
// ============================================

export function useSchemes(params?: { category?: string; state?: string; search?: string }) {
  const queryKey = params ? [api.schemes.list.path, params] : [api.schemes.list.path];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      let url = api.schemes.list.path;
      const deviceId = getDeviceId();
      const queryParams = new URLSearchParams();
      queryParams.set("deviceId", deviceId);

      if (params) {
        if (params.category) queryParams.set("category", params.category);
        if (params.state) queryParams.set("state", params.state);
        if (params.search) queryParams.set("search", params.search);
      }
      url += `?${queryParams.toString()}`;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch schemes");
      return api.schemes.list.responses[200].parse(await res.json());
    },
  });
}

export function useScheme(id: number) {
  return useQuery({
    queryKey: [api.schemes.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.schemes.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) throw new Error("Scheme not found");
      if (!res.ok) throw new Error("Failed to fetch scheme");
      return api.schemes.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// ============================================
// Chat Hooks
// ============================================

export type SendChatParams = z.infer<typeof api.chat.send.input>;

export function useChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<SendChatParams, "deviceId">) => {
      const payload: SendChatParams = { ...data, deviceId: getDeviceId() };
      const validated = api.chat.send.input.parse(payload);
      const res = await fetch(api.chat.send.path, {
        method: api.chat.send.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.chat.send.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error('Failed to send message');
      }
      
      return api.chat.send.responses[200].parse(await res.json());
    },
  });
}
