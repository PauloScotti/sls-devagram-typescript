import { validateEnvs } from '../utils/environmentsUtils';
import { UserModel } from '../models/UserModel';
import { getUserIdFromEvent } from "../utils/authenticationHendlerUtils";
import { Handler } from "aws-lambda";
import { DefaultJsonResponse, formatDefalutResponse } from '../utils/formatResponseUtils';


export const toggle: Handler = async (event: any): Promise<DefaultJsonResponse> => {
    try {
        const { error } = validateEnvs(['USER_TABLE']);

        if (error) {
            return formatDefalutResponse(500, error);
        }

        const userId = getUserIdFromEvent(event);

        if(!userId) {
            return formatDefalutResponse(400, "Usuário logado não encontrado");
        }

        const loggedUser = await UserModel.get({'cognitoId' : userId});

        const {followId} = event.pathParameters;

        if(!followId) {
            return formatDefalutResponse(400, "Usuário a ser seguido não encontrado");
        }
        
        if(loggedUser === followId) {
            return formatDefalutResponse(400, "Usuário não pode seguir a si mesmo");
        }
        
        const followUser = await UserModel.get({'cognitoId' : followId});
        
        if(!followUser) {
            return formatDefalutResponse(400, "Usuário a ser seguido não encontrado");
        }

        const hasFollow = loggedUser.following.findIndex(e => e === followId);

        if(hasFollow != -1) {
            loggedUser.following.splice(hasFollow, 1);
            followUser.followers = followUser.followers - 1;
            await UserModel.update(loggedUser);
            await UserModel.update(followUser);
            return formatDefalutResponse(200, "Usuário deixado de seguir com sucesso");
        } else {
            loggedUser.following.push(followId);
            followUser.followers = followUser.followers + 1;
            await UserModel.update(loggedUser);
            await UserModel.update(followUser);
            return formatDefalutResponse(200, "Usuário seguido com sucesso");
        }

    } catch (e: any) {
        console.log('Error on follow/unfollow user: ', e);
        return formatDefalutResponse(500, 'Erro ao seguir/deixar de seguir usuário: ' + e);
    }
}