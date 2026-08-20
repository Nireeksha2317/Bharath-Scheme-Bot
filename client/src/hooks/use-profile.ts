import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { v4 as uuidv4 } from "uuid";
import type { UserProfile } from "@shared/schema";

const DEVICE_ID_KEY = "bharat_welfare_device_id";

export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function useProfile() {
  const deviceId = getDeviceId();

  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["/api/profile", deviceId],
    queryFn: async () => {
      const res = await fetch(`/api/profile?deviceId=${deviceId}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch profile");
      }
      return res.json();
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (updatedProfile: Partial<UserProfile>) => {
      const res = await apiRequest("POST", "/api/profile", {
        deviceId,
        profile: updatedProfile,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile", deviceId] });
    },
  });

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    deviceId
  };
}
