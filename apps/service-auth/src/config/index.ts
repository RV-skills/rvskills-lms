import dotenv from 'dotenv';
import { validateEnv } from '@rv-lms/shared-config';

function loadEnv(){
    dotenv.config();
    console.log(`Environment variables loaded`);
}



loadEnv();

export const serverConfig = validateEnv();