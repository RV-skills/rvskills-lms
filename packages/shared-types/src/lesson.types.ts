export interface ContentMetadataDTO {
    content_id: string;
    lesson_id: string;
    s3_key: string;
    mime_type: string;
    file_size: number;
    duration_secs: number | null;
    original_filename: string | null;
    processing_status: string;
    download_count: number;
    created_At: Date;
}

export interface LessonDTO {
    lesson_id: string;
    module_id: string;
    title: string;
    content_type: string;
    order_index: number;
    is_preview: boolean;
    estimated_duration_mins: number | null;
    created_at: Date;
    updated_at: Date;
    content_metadata?: ContentMetadataDTO | null;
}