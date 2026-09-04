import { serverConfig } from "../config";
import { fetchWithTimeout, correlationHeaders } from "../utils/http-client.util";
import { BadGatewayError } from "@rv-lms/shared-utils";
import type { UserSummaryDTO } from "@rv-lms/shared-types";

export async function getUsersByIds(userIds: string[], accessToken: string): Promise<UserSummaryDTO[]> {
  if (userIds.length === 0) return [];

  const uniqueIds = [...new Set(userIds)];
  const res = await fetchWithTimeout(
    `${serverConfig.SERVICE_AUTH_URL}/api/v1/users?ids=${uniqueIds.join(",")}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...correlationHeaders(),
      },
    }
  );

  if (!res.ok) {
    throw new BadGatewayError(`service-auth returned ${res.status} for batch user lookup`);
  }

  const body = (await res.json()) as { success: boolean; data: UserSummaryDTO[] };
  return body.data;
}