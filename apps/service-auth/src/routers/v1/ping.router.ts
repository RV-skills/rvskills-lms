import { pingHandler } from "../../controllers/ping.controller";
import { validateRequestBody } from "../../validators";
import { pingSchema } from "../../validators/ping.validator";
import { Router } from 'express';

const pingRouter: Router = Router();

pingRouter.get('/',validateRequestBody(pingSchema),pingHandler);

pingRouter.get('/health',(req,res) => {
    res.status(200).send('ok');
});

export default pingRouter;