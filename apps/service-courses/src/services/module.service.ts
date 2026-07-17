import { ModuleDTO } from "@rv-lms/shared-types";
import { CreateModuleInput, moduleRepository, UpdateModuleInput } from "../repositories/module.repository";
import { NotFoundError } from "@rv-lms/shared-utils";

const mapToModuleDTO = (module: any): ModuleDTO => ({
    module_id: module.module_id,
    course_id: module.course_id,
    title: module.title,
    description: module.description,
    order_index: module.order_index,
    is_locked: module.is_locked,
    created_at: module.created_at,
    updated_at: module.updated_at,
    lessons: module.lessons?.map((l: any) => ({
        lesson_id: l.lesson_id,
        module_id: l.module_id,
        title: l.title,
        content_type: l.content_type,
        order_index: l.order_index,
        is_preview: l.is_preview,
        estimated_duration_mins: l.estimated_duration_mins,
        created_at: l.created_at,
        updated_at: l.updated_at
    })) ?? undefined
})

export const moduleService = {
    async createModule(
        data: Omit<CreateModuleInput, "omit_index"> & { order_index?: number }
    ): Promise<ModuleDTO> {
        const order_index = data.order_index ??
            await moduleRepository.getNextOrderIndex(data.course_id);
        
        const module = await moduleRepository.create({
            ...data,
            order_index,
        });

        return mapToModuleDTO(module);
    },

    async getModule(module_id: string): Promise<ModuleDTO> {
        const module = await moduleRepository.findById(module_id);

        if(!module){
            throw new NotFoundError("Module not found");
        }

        return mapToModuleDTO(module);
    },

    async listModules(course_id: string): Promise<ModuleDTO[]> {
        const modules = await moduleRepository.findByCourse(course_id);
        return modules.map(mapToModuleDTO);
    },

    async updateModule(
        module_id: string,
        data: UpdateModuleInput
    ): Promise<ModuleDTO> {
        const existing = await moduleRepository.findById(module_id);

        if(!existing) {
            throw new NotFoundError("Module not found");
        }

        await moduleRepository.update(module_id, data);

        const updated = await moduleRepository.findById(module_id);
        return mapToModuleDTO(updated);
    },

    async deleteModule(module_id: string): Promise<void> {
        const existing = await moduleRepository.findById(module_id);

        if (!existing) {
        throw new NotFoundError('Module not found');
        }

        await moduleRepository.softDelete(module_id);
    },
};