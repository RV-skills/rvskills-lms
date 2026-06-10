import { UserDTO } from "./user.dto"

export interface AuthTokenDTO {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    user: UserDTO;
}

export interface RefreshTokenDTO {
    refresh_token: string;
}