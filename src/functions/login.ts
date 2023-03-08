import { APIGatewayEvent, Handler } from "aws-lambda";
import { CognitoServices } from "../services/CognitoServices";
import { DefaultJsonResponse, formatDefalutResponse } from "../utils/formatResponseUtils";
import { LoginRequest } from '../types/login/LoginRequest';
import { validateEnvs } from "../utils/environmentsUtils";
import {logger} from '../utils/loggerUtils';

export const handler: Handler = async (event: APIGatewayEvent): Promise<DefaultJsonResponse> => {
    try {
        const { USER_POOL_ID, USER_POOL_CLIENT_ID, error } = validateEnvs(['USER_POOL_ID', 'USER_POOL_CLIENT_ID']);

        if (error) {
            logger.error('login.handler - ', error);
            return formatDefalutResponse(500, error);
        }

        if (!event.body) {
            return formatDefalutResponse(400, 'Parâmetros de entrada não informados');
        }

        const request = JSON.parse(event.body) as LoginRequest;
        const { login, password } = request;

        if (!password || !login) {
            return formatDefalutResponse(400, 'Parâmetros de entrada inválidos');
        }

        logger.info('login.handler - start:', login);
        const result = await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).login(login, password);

        logger.debug('login.handler - cognito response:', result);
        logger.info('login.handler - finish:', login);
        
        return formatDefalutResponse(200, undefined, result);

    } catch (e: any) {
        logger.error('login.handler - Error on login user: ', e);
        return formatDefalutResponse(500, 'Erro ao fazer login do usuário: ' + e);
    }
}