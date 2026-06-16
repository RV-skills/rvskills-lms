import { PrismaClient } from "../generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter  = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });


export interface CreateUserInput {
    tenant_id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    password_hash: string;
}

export interface UpdateUserInput {
    first_name?: string;
    last_name?: string;
    username?: string;
    status?: string;
}


export const userRepository = {
    async findById(user_id: string, tenant_id: string) {
        return prisma.user.findFirst({
            where: {
                user_id,
                tenant_id,
                deleted_at: null,
            },
            select: {
                user_id: true,
                tenant_id: true,
                first_name: true,
                last_name: true,
                email: true,
                status: true,
                created_at: true,
                updated_at: true,
                password_hash: false,
                deleted_at: false
            }
        });
    },

    async findByEmail(email: string, tenant_id: string) {
        return prisma.user.findFirst({
            where: {
                email,
                tenant_id,
                deleted_at: null
            }
        })
    },

    async findByUsername(username: string, tenant_id: string) {
        return prisma.user.findFirst({
            where: {
                username,
                tenant_id,
                deleted_at: null
            },
            select: {
                user_id: true,
                tenant_id: true,
                first_name: true,
                last_name: true,
                username: true,
                email: true,
                status: true,
                created_at: true,
                updated_at: true,
                password_hash: false,
                deleted_at: false
            },
        });
    },

    async findWithRoles(user_id: string, tenant_id: string) {
        return prisma.user.findFirst({
            where: {
                user_id,
                tenant_id,
                deleted_at: null
            },
            select: {
                user_id: true,
                tenant_id: true,
                first_name: true,
                last_name: true,
                username: true,
                email: true,
                status: true,
                created_at: true,
                updated_at: true,
                user_roles: {
                    select: {
                        role: {
                            select: {
                                role_id: true,
                                role_name: true,
                                role_description: true,
                                is_system_role: true,
                                role_permissions: {
                                    select: {
                                        permission: {
                                            select: {
                                                permission_id: true,
                                                resource: true,
                                                action: true,
                                            }
                                        }
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    },

    async create(data: CreateUserInput) {
        return prisma.user.create({
            data,
            select: {
                user_id: true,
                tenant_id: true,
                first_name: true,
                last_name: true,
                username: true,
                email: true,
                status: true,
                created_at: true,
                updated_at: true
            },
        });
    },

    async update(user_id: string, tenant_id: string, data: UpdateUserInput) {
        return prisma.user.update({
            where: {
                user_id,
                tenant_id
            },
            data,
            select: {
                user_id: true,
                tenant_id: true,
                first_name: true,
                last_name: true,
                username: true,
                email: true,
                status: true,
                created_at: true,
                updated_at: true
            },
        });
    },

    async softDelete(user_id: string, tenant_id: string) {
        return prisma.user.update({
            where: {
                user_id,
                tenant_id
            },
            data: {
                deleted_at: new Date(),
                status: "inactive",
            },
        });
    },

    async assignRole(user_id: string, role_id: string) {
        return prisma.userRole.create({
            data: { 
                user_id, 
                role_id 
            },
        });
    },

     async findRoleByName(role_name: string, tenant_id: string) {
        return prisma.role.findFirst({
        where: { 
            role_name, 
            tenant_id 
            },
        });
    },

};