import { RoleDTO } from "./role.dto";

export interface UserDTO {
    user_id: string;
    tenant_id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    status: string;
    roles: RoleDTO[];
    created_at: Date;
    updated_at: Date;
}

export interface CreateUserDTO {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    password: string;
}

export interface UpdateUserDTO {
    first_name?: string;
    last_name?: string;
    username?: string;
}