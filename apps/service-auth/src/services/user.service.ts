import bcrypt from "bcrypt";
import { userRepository } from "../repositories/user.repository";
import { ConflictError, NotFoundError } from "@rv-lms/shared-utils";
import type { CreateUserDTO, UpdateUserDTO, UserDTO, UserSummaryDTO } from "@rv-lms/shared-types";


const DEFAULT_TENANT_ID = "rv-skills-tenant";
const SALT_ROUNDS = 12;
const DEFAULT_ROLE_NAME = "Student";


const mapToUserDTO = (user: any): UserDTO => {
    return {
        user_id: user.user_id,
        tenant_id: user.tenant_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        email: user.email,
        status: user.status,
        roles: user.user_roles?.map((ur: any) => ur.role) ?? [],
        created_at: user.created_at,
        updated_at: user.updated_at
    };
};

function generatePassword(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

export const userService = {

    async register(data: CreateUserDTO): Promise<UserDTO> {
        const existingEmail = await userRepository.findByEmail(
            data.email,
            DEFAULT_TENANT_ID
        );
        if(existingEmail) {
            throw new ConflictError("Email is already registered");
        }

        const existingUsername = await userRepository.findByUsername(
            data.username,
            DEFAULT_TENANT_ID
        );
        if(existingUsername) {
            throw new ConflictError("Username is already taken");
        }

        const password_hash = await bcrypt.hash(data.password, SALT_ROUNDS);

        const newUser = await userRepository.create({
            tenant_id: DEFAULT_TENANT_ID,
            first_name: data.first_name,
            last_name: data.last_name,
            username: data.username,
            email: data.email,
            password_hash,
        });

        const studentRole = await userRepository.findRoleByName(
            DEFAULT_ROLE_NAME,
            DEFAULT_TENANT_ID
        );
        
        if(studentRole) {
            await userRepository.assignRole(newUser.user_id, studentRole.role_id);
        }

        const userWithRoles = await userRepository.findWithRoles(
            newUser.user_id,
            DEFAULT_TENANT_ID
        );

        return mapToUserDTO(userWithRoles);
    },

    async getProfile(user_id: string): Promise<UserDTO> {
        const user = await userRepository.findWithRoles(
            user_id,
            DEFAULT_TENANT_ID
        )

        if(!user){
            throw new NotFoundError("User not found");
        }

        return mapToUserDTO(user);
    },

    async updateProfile(user_id: string, data: UpdateUserDTO): Promise<UserDTO> {
        const existing = await userRepository.findById(
            user_id,
            DEFAULT_TENANT_ID
        );

        if(!existing){
            throw new NotFoundError("User not found");
        }
        
        if(data.username){
            const existingUsername = await userRepository.findByUsername(
                data.username,
                DEFAULT_TENANT_ID
            );

            if(existingUsername && existingUsername.user_id !== user_id) {
                throw new ConflictError('Username is already taken');
            }
        }

        await userRepository.update(user_id, DEFAULT_TENANT_ID, data);

         const updatedUser = await userRepository.findWithRoles(
            user_id,
            DEFAULT_TENANT_ID
        );

        return mapToUserDTO(updatedUser);
    },

    async getUsersByIds(user_ids: string[]): Promise<UserSummaryDTO[]> {
        if (user_ids.length === 0) return [];
        return userRepository.findManyByIds(user_ids, DEFAULT_TENANT_ID);
    },

    async listAllUsers(filters?: { search?: string; role_id?: string; status?: string }): Promise<any[]> {
        return userRepository.findAll(DEFAULT_TENANT_ID, filters);
    },

    async listAllRoles(): Promise<{ role_id: string; role_name: string }[]> {
        return userRepository.findAllRoles(DEFAULT_TENANT_ID);
    },

    async assignRoleToUser(user_id: string, role_id: string): Promise<UserDTO> {
        const user = await userRepository.findById(user_id, DEFAULT_TENANT_ID);
        if (!user) {
            throw new NotFoundError("User not found");
        }

        const alreadyHasRole = await userRepository.hasRole(user_id, role_id);
        if (!alreadyHasRole) {
            await userRepository.assignRole(user_id, role_id);
        }

        const updated = await userRepository.findWithRoles(user_id, DEFAULT_TENANT_ID);
        return mapToUserDTO(updated);
    },

    async removeRoleFromUser(user_id: string, role_id: string): Promise<UserDTO> {
        const user = await userRepository.findById(user_id, DEFAULT_TENANT_ID);
        if (!user) {
            throw new NotFoundError("User not found");
        }

        await userRepository.removeRole(user_id, role_id);

        const updated = await userRepository.findWithRoles(user_id, DEFAULT_TENANT_ID);
        return mapToUserDTO(updated);
    },

    async adminCreateUser(data: {
        first_name: string;
        last_name: string;
        username: string;
        email: string;
        role_id: string;
    }): Promise<{ user: UserDTO; generated_password: string }> {
        const existingEmail = await userRepository.findByEmail(data.email, DEFAULT_TENANT_ID);
        if (existingEmail) {
            throw new ConflictError("Email is already registered");
        }

        const existingUsername = await userRepository.findByUsername(data.username, DEFAULT_TENANT_ID);
        if (existingUsername) {
            throw new ConflictError("Username is already taken");
        }

        const generated_password = generatePassword();
        const password_hash = await bcrypt.hash(generated_password, SALT_ROUNDS);

        const newUser = await userRepository.create({
            tenant_id: DEFAULT_TENANT_ID,
            first_name: data.first_name,
            last_name: data.last_name,
            username: data.username,
            email: data.email,
            password_hash,
        });

        await userRepository.assignRole(newUser.user_id, data.role_id);

        const userWithRoles = await userRepository.findWithRoles(newUser.user_id, DEFAULT_TENANT_ID);

        return { user: mapToUserDTO(userWithRoles), generated_password };
    },

    async adminBatchCreateStudents(
        rows: { first_name: string; last_name: string; username: string; email: string }[]
    ): Promise<{
        created: { user: UserDTO; generated_password: string }[];
        failed: { row: typeof rows[number]; reason: string }[];
    }> {
        const studentRole = await userRepository.findRoleByName(DEFAULT_ROLE_NAME, DEFAULT_TENANT_ID);
        if (!studentRole) {
            throw new NotFoundError("Student role not found");
        }

        const created: { user: UserDTO; generated_password: string }[] = [];
        const failed: { row: typeof rows[number]; reason: string }[] = [];

        for (const row of rows) {
            try {
                const result = await this.adminCreateUser({
                    ...row,
                    role_id: studentRole.role_id,
                });
                created.push(result);
            } catch (err) {
                failed.push({
                    row,
                    reason: err instanceof Error ? err.message : "Unknown error",
                });
            }
        }

        return { created, failed };
    },

    async adminSetUserStatus(user_id: string, status: "active" | "inactive"): Promise<UserDTO> {
        const existing = await userRepository.findById(user_id, DEFAULT_TENANT_ID);
        if (!existing) {
            throw new NotFoundError("User not found");
        }

        await userRepository.update(user_id, DEFAULT_TENANT_ID, { status });

        const updated = await userRepository.findWithRoles(user_id, DEFAULT_TENANT_ID);
        return mapToUserDTO(updated);
    },

    async adminResetPassword(user_id: string): Promise<{ user: UserDTO; generated_password: string }> {
        const existing = await userRepository.findById(user_id, DEFAULT_TENANT_ID);
        if (!existing) {
            throw new NotFoundError("User not found");
        }

        const generated_password = generatePassword();
        const password_hash = await bcrypt.hash(generated_password, SALT_ROUNDS);
        await userRepository.setPasswordHash(user_id, DEFAULT_TENANT_ID, password_hash);

        const updated = await userRepository.findWithRoles(user_id, DEFAULT_TENANT_ID);
        return { user: mapToUserDTO(updated), generated_password };
    },
}