import { userService } from '../user.service';
import { userRepository } from '../../repositories/user.repository';
import { ConflictError, NotFoundError } from '@rv-lms/shared-utils';

jest.mock("../../repositories/user.repository", () => ({
    userRepository: {
        findById: jest.fn(),
        findByEmail: jest.fn(),
        findByUsername: jest.fn(),
        findWithRoles: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        softDelete: jest.fn(),
        assignRole: jest.fn(),
        findRoleByName: jest.fn(),
    },
}));


describe("userService.register", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    it("registers a new user successfully", async () => {
        (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
        (userRepository.findByUsername as jest.Mock).mockResolvedValue(null);
        (userRepository.create as jest.Mock).mockResolvedValue({
            user_id: "user-1",
            tenant_id: "rv-skills-tenant",
            email: "test@rv-skills.com"
        });
        (userRepository.findRoleByName as jest.Mock).mockResolvedValue({
            role_id: "role-student"
        });
        (userRepository.findWithRoles as jest.Mock).mockResolvedValue({
            user_id: "user-1",
            tenant_id: "rv-skills-tenant",
            first_name: "Test",
            last_name: "User",
            username: "testuser",
            email: "test@rvskills.com",
            status: "active",
            created_at: new Date(),
            updated_at: new Date(),
            user_roles: [
                { role: { role_id: "role-student", role_name: "Student" } },
            ],
        });
        const result = await userService.register({
            first_name: "Test",
            last_name: "User",
            username: "testuser",
            email: "test@rvskills.com",
            password: "password123",
        });
        
        expect(result.email).toBe("test@rvskills.com");
        expect(result).not.toHaveProperty("password_hash");
        expect(userRepository.assignRole).toHaveBeenCalledWith(
            "user-1",
            "role-student"
        );
    });


    it("throws ConflictError if email already exists", async () => {
        (userRepository.findByEmail as jest.Mock).mockResolvedValue({
            user_id: "existing-user"
        });

        await expect(
            userService.register({
                first_name: 'Test',
                last_name: 'User',
                username: 'testuser',
                email: 'taken@rvskills.com',
                password: 'password123',
            })
          ).rejects.toThrow(ConflictError);
        });

    it('throws ConflictError if username already exists', async () => {
        (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
        (userRepository.findByUsername as jest.Mock).mockResolvedValue({
          user_id: 'existing-user',
        });

        await expect(
          userService.register({
            first_name: 'Test',
            last_name: 'User',
            username: 'takenuser',
            email: 'new@rvskills.com',
            password: 'password123',
          })
        ).rejects.toThrow(ConflictError);
      });
});

describe("userService.getProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns user profile when found', async () => {
    (userRepository.findWithRoles as jest.Mock).mockResolvedValue({
      user_id: 'user-1',
      tenant_id: 'rv-skills-tenant',
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      email: 'test@rvskills.com',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      user_roles: [],
    });

    const result = await userService.getProfile('user-1');

    expect(result.user_id).toBe('user-1');
  });

  it('throws NotFoundError when user does not exist', async () => {
    (userRepository.findWithRoles as jest.Mock).mockResolvedValue(null);

    await expect(
      userService.getProfile('missing-user')
    ).rejects.toThrow(NotFoundError);
  });
});