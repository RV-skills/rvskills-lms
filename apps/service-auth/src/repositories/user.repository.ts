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

    async findManyByIds(user_ids: string[], tenant_id: string) {
        return prisma.user.findMany({
            where: {
                user_id: { in: user_ids },
                tenant_id,
                deleted_at: null,
            },
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                username: true,
            },
        });
    },

    async findAll(
        tenant_id: string,
        filters?: { search?: string; role_id?: string; status?: string },
        options?: { skip?: number; take?: number; sortBy?: "first_name" | "email" | "status"; sortOrder?: "asc" | "desc" }
    ) {
        const where = {
            tenant_id,
            deleted_at: null,
            ...(filters?.status && { status: filters.status }),
            ...(filters?.search && {
                OR: [
                    { first_name: { contains: filters.search, mode: "insensitive" as const } },
                    { last_name: { contains: filters.search, mode: "insensitive" as const } },
                    { email: { contains: filters.search, mode: "insensitive" as const } },
                    { username: { contains: filters.search, mode: "insensitive" as const } },
                ],
            }),
            ...(filters?.role_id && {
                user_roles: { some: { role_id: filters.role_id } },
            }),
        };

        return prisma.user.findMany({
            where,
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                username: true,
                email: true,
                status: true,
                user_roles: {
                    select: {
                        role: {
                            select: { role_id: true, role_name: true },
                        },
                    },
                },
            },
            orderBy: options?.sortBy
                ? { [options.sortBy]: options.sortOrder ?? "asc" }
                : { created_at: "desc" },
            skip: options?.skip,
            take: options?.take,
        });
    },

    async countAll(tenant_id: string, filters?: { search?: string; role_id?: string; status?: string }) {
        const where = {
            tenant_id,
            deleted_at: null,
            ...(filters?.status && { status: filters.status }),
            ...(filters?.search && {
                OR: [
                    { first_name: { contains: filters.search, mode: "insensitive" as const } },
                    { last_name: { contains: filters.search, mode: "insensitive" as const } },
                    { email: { contains: filters.search, mode: "insensitive" as const } },
                    { username: { contains: filters.search, mode: "insensitive" as const } },
                ],
            }),
            ...(filters?.role_id && {
                user_roles: { some: { role_id: filters.role_id } },
            }),
        };

        return prisma.user.count({ where });
    },
    async findAllRoles(tenant_id: string) {
        return prisma.role.findMany({
            where: { tenant_id },
            select: { role_id: true, role_name: true },
        });
    },

    async removeRole(user_id: string, role_id: string) {
        return prisma.userRole.deleteMany({
            where: { user_id, role_id },
        });
    },

    async hasRole(user_id: string, role_id: string) {
        const existing = await prisma.userRole.findFirst({
            where: { user_id, role_id },
        });
        return !!existing;
    },

    async setPasswordHash(user_id: string, tenant_id: string, password_hash: string) {
        return prisma.user.update({
            where: { user_id, tenant_id },
            data: { password_hash },
        });
    },
};