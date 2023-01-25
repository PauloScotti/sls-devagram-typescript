import { UserModel } from '../models/UserModel';
import { APIGatewayEvent, Handler } from "aws-lambda";
import { getUserIdFromEvent } from "../utils/authenticationHendlerUtils";
import { DefaultJsonResponse, formatDefalutResponse } from '../utils/formatResponseUtils';
import { S3Service } from '../services/S3Services';
import { parse } from 'aws-multipart-parser';
import { FileData } from 'aws-multipart-parser/dist/models';
import { imageExtensionsAllowed } from '../constants/Regexes';
import { validateEnvs } from '../utils/environmentsUtils';

export const me: Handler = async (event: APIGatewayEvent): Promise<DefaultJsonResponse> => {
    try {
        const { AVATAR_BUCKET, error } = validateEnvs(['USER_TABLE', 'AVATAR_BUCKET']);

        if (error) {
            return formatDefalutResponse(500, error);
        }

        const userId = getUserIdFromEvent(event);

        if (!userId) {
            return formatDefalutResponse(400, 'Usuário não encontrado');
        }

        const user = await UserModel.get({ 'cognitoId': userId });
        if (user && user.avatar) {
            const url = await new S3Service().getImageURL(AVATAR_BUCKET, user.avatar);
            user.avatar = url;
        }

        return formatDefalutResponse(200, undefined, user);

    } catch (e: any) {
        console.log('Error on request forgot password: ', e);
        return formatDefalutResponse(500, 'Erro ao fazer login do usuário: ' + e);
    }
}

export const update: Handler = async (event: APIGatewayEvent): Promise<DefaultJsonResponse> => {
    try {
        const { AVATAR_BUCKET, error } = validateEnvs(['USER_TABLE', 'AVATAR_BUCKET']);

        if (error) {
            return formatDefalutResponse(500, error);
        }

        const userId = getUserIdFromEvent(event);

        if (!userId) {
            return formatDefalutResponse(400, 'Usuário não encontrado');
        }

        const user = await UserModel.get({ 'cognitoId': userId });

        const formData = parse(event, true);

        const file = formData.file as FileData;
        const name = formData.name as string;

        if (name && name.trim().length < 2) {
            return formatDefalutResponse(400, 'Nome inválido');
        } else if (name) {
            user.name = name;
        }

        if (file && !imageExtensionsAllowed.exec(file.filename)) {
            return formatDefalutResponse(400, 'Extensão informada do arquivo não é válida');
        } else if (file) {
            const newKey = await new S3Service().saveImage(AVATAR_BUCKET, 'avatar', file);
            user.avatar = newKey;
        }

        await UserModel.update(user);

        return formatDefalutResponse(200, "Usuário alterado com sucesso!");

    } catch (e: any) {
        console.log('Error on update user data: ', e);
        return formatDefalutResponse(500, 'Erro ao atualizar dados do usuário: ' + e);
    }
}
