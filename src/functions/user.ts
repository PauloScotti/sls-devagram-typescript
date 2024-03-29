import { UserModel } from '../models/UserModel';
import { APIGatewayEvent, Handler } from "aws-lambda";
import { getUserIdFromEvent } from "../utils/authenticationHendlerUtils";
import { DefaultJsonResponse, formatDefalutResponse } from '../utils/formatResponseUtils';
import { S3Service } from '../services/S3Services';
import { parse } from 'aws-multipart-parser';
import { FileData } from 'aws-multipart-parser/dist/models';
import { imageExtensionsAllowed } from '../constants/Regexes';
import { validateEnvs } from '../utils/environmentsUtils';
import { DefaultListPaginatedResponseMessage } from '../types/DefaultListPaginatedResponseMessage';

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

export const getUserById: Handler = async (event: any): Promise<DefaultJsonResponse> => {
    try {
        const { AVATAR_BUCKET, error } = validateEnvs(['USER_TABLE', 'AVATAR_BUCKET']);

        if (error) {
            return formatDefalutResponse(500, error);
        }

        const { userId } = event.pathParameters;

        if (!userId) {
            return formatDefalutResponse(400, 'Usuário não encontrado');
        }

        const user = await UserModel.get({ 'cognitoId': userId });
        
        if (!user) {
            return formatDefalutResponse(400, 'Usuário não encontrado');
        }

        if (user.avatar) {
            user.avatar = await new S3Service().getImageURL(AVATAR_BUCKET, user.avatar);
        }

        return formatDefalutResponse(200, undefined, user);

    } catch (e: any) {
        console.log('Error on get user by id: ', e);
        return formatDefalutResponse(500, 'Erro ao buscar dados do usuário por id: ' + e);
    }
}

export const searchUser: Handler = async (event: any): Promise<DefaultJsonResponse> => {
    try {
        const { AVATAR_BUCKET, error } = validateEnvs(['USER_TABLE', 'AVATAR_BUCKET']);

        if (error) {
            return formatDefalutResponse(500, error);
        }

        const { filter } = event.pathParameters;

        if(!filter || filter.length < 3) {
            return formatDefalutResponse(400, 'Filtro não informado: ' + error);
        }

        const {lastKey} = event.queryStringParameters || '';

        const query = UserModel.scan()
                    .where("name").contains(filter)
                    .or().where("email").contains(filter);

        if(lastKey) {
            query.startAt({cognitoId:lastKey});
        }

        const result = await query.limit(5).exec();

        const response = {} as DefaultListPaginatedResponseMessage;

        if(result) {
            response.count = result.count;
            response.lastKey = result.lastKey;

            for(const document of result) {
                if(document && document.avatar) {
                    document.avatar = await new S3Service().getImageURL(AVATAR_BUCKET, document.avatar);
                }
            }

            response.data = result;
        }

        return formatDefalutResponse(200, undefined, response);

    } catch (e: any) {
        console.log('Error on search user by filter: ', e);
        return formatDefalutResponse(500, 'Erro ao buscar usuário por nome ou e-mail: ' + e);
    }
}