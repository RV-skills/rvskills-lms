export interface RoleDTO {
    role_id: string;
    tenant_id: string;
    role_name: string;
    role_description: string | null;
    is_system_role: boolean;
    created_at: Date;
    updated_at: Date;
}