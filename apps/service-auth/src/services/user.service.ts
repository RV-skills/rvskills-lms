import bcrypt from "bcrypt";
import { userRepository } from "../repositories/user.repository";
import { ConflictError, NotFoundError } from "@rv-lms/shared-utils";
import type { CreateUserDTO, UpdateUserDTO, UserDTO } from "@rv-lms/shared-types";


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

}