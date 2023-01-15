import { UserModel } from '../models/UserModel';
import { APIGatewayEvent, Handler } from "aws-lambda";
import { getUserIdFromEvent } from "../utils/authenticationHendlerUtils";
import { DefaultJsonResponse, formatDefalutResponse } from '../utils/formatResponseUtils';
import { S3Service } from '../services/S3Services';

export const me: Handler = async (event: APIGatewayEvent): Promise<DefaultJsonResponse> => {
    try {
        const { USER_TABLE, AVATAR_BUCKET } = process.env;

        if (!USER_TABLE || !AVATAR_BUCKET) {
            return formatDefalutResponse(500, 'ENVs para serviço não encontradas');
        }

        const userId = getUserIdFromEvent(event);

        if(!userId) {
            return formatDefalutResponse(400, 'Usuário não encontrado');
        }

        const user = await UserModel.get({'cognitoId' : userId});
        if(user && user.avatar) {
            const url = await new S3Service().getImageURL(AVATAR_BUCKET, user.avatar);
            user.avatar = url;
        }

        return formatDefalutResponse(200, undefined, user);

    } catch (e: any) {
        console.log('Error on request forgot password: ', e);
        return formatDefalutResponse(500, 'Erro ao fazer login do usuário: ' + e);
    }
}