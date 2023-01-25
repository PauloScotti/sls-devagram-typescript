import { APIGatewayEvent, Handler } from "aws-lambda";
import { CognitoServices } from "../services/CognitoServices";
import { DefaultJsonResponse, formatDefalutResponse } from "../utils/formatResponseUtils";
import { LoginRequest } from '../types/login/LoginRequest';
import { validateEnvs } from "../utils/environmentsUtils";

export const handler: Handler = async (event: APIGatewayEvent): Promise<DefaultJsonResponse> => {
    try {
        const { USER_POOL_ID, USER_POOL_CLIENT_ID, error } = validateEnvs(['USER_POOL_ID', 'USER_POOL_CLIENT_ID']);

        if (error) {
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

        const result = await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).login(login, password);
        return formatDefalutResponse(200, undefined, result);

    } catch (e: any) {
        console.log('Error on request forgot password: ', e);
        return formatDefalutResponse(500, 'Erro ao fazer login do usuário: ' + e);
    }
}