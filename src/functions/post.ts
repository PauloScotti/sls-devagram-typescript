import { UserModel } from '../models/UserModel';
import { APIGatewayEvent, Handler } from "aws-lambda";
import { getUserIdFromEvent } from "../utils/authenticationHendlerUtils";
import { DefaultJsonResponse, formatDefalutResponse } from '../utils/formatResponseUtils';
import { S3Service } from '../services/S3Services';
import { parse } from 'aws-multipart-parser';
import { FileData } from 'aws-multipart-parser/dist/models';
import { imageExtensionsAllowed } from '../constants/Regexes';
import { validateEnvs } from '../utils/environmentsUtils';
import * as Uuid from 'uuid';
import * as moment from 'moment';
import { PostModel } from '../models/PostModel';

export const create: Handler = async (event: APIGatewayEvent): Promise<DefaultJsonResponse> => {
    try {
        const { POST_BUCKET, error } = validateEnvs(['POST_TABLE', 'POST_BUCKET']);

        if (error) {
            return formatDefalutResponse(500, error);
        }

        const userId = getUserIdFromEvent(event);

        if (!userId) {
            return formatDefalutResponse(400, 'Usuário não encontrado');
        }

        const user = await UserModel.get({ 'cognitoId': userId });

        if (!user) {
            return formatDefalutResponse(400, 'Usuário não encontrado');
        }

        const formData = parse(event, true);

        const file = formData.file as FileData;
        const description = formData.description as string;

        if (!description || description.trim().length < 5) {
            return formatDefalutResponse(400, 'Descrição inválida');
        } else if (description) {
            user.description = description;
        }

        if (!file || !imageExtensionsAllowed.exec(file.filename)) {
            return formatDefalutResponse(400, 'Extensão informada do arquivo não é válida');
        }

        const imageKey = await new S3Service().saveImage(POST_BUCKET, 'post', file);
        
        const post = {
            id: Uuid.v4(),
            userId,
            description,
            date: moment().format(),
            image: imageKey
        };

        await PostModel.create(post);

        user.posts = user.posts+1;
        await UserModel.update(user);

        return formatDefalutResponse(200, "Publicação criada com sucesso!");

    } catch (e: any) {
        console.log('Error on create post: ', e);
        return formatDefalutResponse(500, 'Erro ao criar publicação: ' + e);
    }
}

export const toggleLike: Handler = async (event: any): Promise<DefaultJsonResponse> => {
    try {
        const { error } = validateEnvs(['POST_TABLE', 'POST_BUCKET']);

        if (error) {
            return formatDefalutResponse(500, error);
        }

        const userId = getUserIdFromEvent(event);

        if (!userId) {
            return formatDefalutResponse(400, 'Usuário não encontrado');
        }

        const user = await UserModel.get({ 'cognitoId': userId });

        if (!user) {
            return formatDefalutResponse(400, 'Usuário não encontrado');
        }

        const {postId} = event.pathParameters;
        const post = await PostModel.get({id: postId});

        if(!post) {
            return formatDefalutResponse(400, 'Publicação não encontrada');
        }

        const hasLikedIndex = post.likes.findIndex(obj => {
            const result = obj.toString() === userId;
            return result;
        });

        if(hasLikedIndex != -1){
            post.likes.splice(hasLikedIndex, 1);
            await PostModel.update(post);
            return formatDefalutResponse(200, "Like removido com sucesso!");
        } else {
            post.likes.push(userId);
            await PostModel.update(post);
            return formatDefalutResponse(200, "Like adicionado com sucesso!");
        }


    } catch (e: any) {
        console.log('Error on toggle like post: ', e);
        return formatDefalutResponse(500, 'Erro ao curtir/descurtir a publicação: ' + e);
    }
}
