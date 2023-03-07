import { UserModel } from '../models/UserModel';
import { PostModel } from '../models/PostModel';
import { Handler } from "aws-lambda";
import { getUserIdFromEvent } from "../utils/authenticationHendlerUtils";
import { DefaultJsonResponse, formatDefalutResponse } from '../utils/formatResponseUtils';
import { FeedLastKeyRequest } from '../types/feed/FeedLastKeyRequest';
import { S3Service } from '../services/S3Services';
import { validateEnvs } from '../utils/environmentsUtils';
import { DefaultListPaginatedResponseMessage } from '../types/DefaultListPaginatedResponseMessage';

export const findByUserId: Handler = async (event: any): Promise<DefaultJsonResponse> => {
    try {
        const { POST_BUCKET, error } = validateEnvs(['USER_TABLE', 'POST_TABLE', 'POST_BUCKET']);
        if (error) {
            return formatDefalutResponse(500, error);
        }

        const { userId } = event.pathParameters || { userId: getUserIdFromEvent(event) };

        if (!userId) {
            return formatDefalutResponse(400, 'Parâmetros de entrada não informados');
        }

        const user = await UserModel.get({ 'cognitoId': userId });

        if (!user) {
            return formatDefalutResponse(400, 'Usuário não encontrado');
        }

        const lastKey = (event.queryStringParameters || '') as FeedLastKeyRequest;

        const query = PostModel.query({ 'userId': userId }).sort("descending");

        if (lastKey && lastKey.id && lastKey.userId && lastKey.date) {
            query.startAt(lastKey);
        }

        const result = await query.limit(20).exec();

        
        const response = {} as DefaultListPaginatedResponseMessage;

        if (result) {
            response.count = result.count;
            response.lastKey = result.lastKey;

            for (const document of result) {
                if (document && document.image) {
                    const url = await new S3Service().getImageURL(POST_BUCKET, document.image);
                    document.image = url;
                }
            }
            response.data = result;
        }
        return formatDefalutResponse(200, undefined, response);
    } catch (e) {
        console.log('Error on get user feed: ', e);
        return formatDefalutResponse(500, 'Erro ao buscar feed do usuário: ' + e);
    }
}

export const feedHome: Handler = async (event: any): Promise<DefaultJsonResponse> => {
    try {
        const { POST_BUCKET, error } = validateEnvs(['USER_TABLE', 'POST_TABLE', 'POST_BUCKET']);
        if (error) {
            return formatDefalutResponse(500, error);
        }

        const { userId } = event.pathParameters || { userId: getUserIdFromEvent(event) };

        if (!userId) {
            return formatDefalutResponse(400, 'Usuário não encontrado');
        }

        const user = await UserModel.get({ 'cognitoId': userId });

        if (!user) {
            return formatDefalutResponse(400, 'Usuário não encontrado');
        }

        const { lastKey } = event.queryStringParameters || '';

        const userToSearch = user.following;
        userToSearch.push(userId);

        const query = PostModel.scan('userId').in(userToSearch);

        if (lastKey) {
            query.startAt({ id: lastKey });
        }

        const result = await query.limit(20).exec();

        const response = {} as DefaultListPaginatedResponseMessage;

        if (result) {
            response.count = result.count;
            response.lastKey = result.lastKey;

            for (const document of result) {
                if (document && document.image) {
                    const url = await new S3Service().getImageURL(POST_BUCKET, document.image);
                    document.image = url;
                }
            }
            response.data = result;
        }

        return formatDefalutResponse(200, undefined, response);

    } catch (e) {
        console.log('Error on get feed homr: ', e);
        return formatDefalutResponse(500, 'Erro ao buscar feed da home: ' + e);
    }
}