import type { Handler, APIGatewayEvent } from 'aws-lambda';
import { passwordRegex, emailRegex, imageExtensionsAllowed } from '../constants/Regexes';
import { CognitoServices } from '../services/CognitoServices';
import { UserRegisterRequest } from '../types/auth/UserRegisterRequest';
import { ConfirmUserEmailRequest } from '../types/auth/ConfirmUserEmailRequest';
import { ChangePasswordRequest } from '../types/auth/ChangePasswordRequest';
import { DefaultJsonResponse, formatDefalutResponse } from '../utils/formatResponseUtils';
import { UserModel } from '../models/UserModel';
import { User } from '../types/models/User';
import { parse } from 'aws-multipart-parser';
import { FileData } from 'aws-multipart-parser/dist/models';
import { S3Service } from '../services/S3Services';
import { validateEnvs } from '../utils/environmentsUtils';

export const register: Handler = async (event: APIGatewayEvent): Promise<DefaultJsonResponse> => {
    try {
        const { USER_POOL_ID, USER_POOL_CLIENT_ID, AVATAR_BUCKET, error } = validateEnvs(['USER_POOL_ID', 'USER_POOL_CLIENT_ID', 'USER_TABLE', 'AVATAR_BUCKET']);

        if (error) {
            return formatDefalutResponse(500, error);
        }

        if (!event.body) {
            return formatDefalutResponse(400, 'Parâmetros de entrada não informados');
        }

        const formData = parse(event, true);
        const file = formData.file as FileData;
        const name = formData.name as string;
        const email = formData.email as string;
        const password = formData.password as string;

        if (!email || !email.match(emailRegex)) {
            return formatDefalutResponse(400, 'Email inválido');
        }
        if (!password || !password.match(passwordRegex)) {
            return formatDefalutResponse(400, 'Senha inválida, senha deve conter pelo menos um caractér maiúsculo, minúsculo, numérico e especial, além de ter pelo menos oito dígitos.');
        }
        if (!name || name.trim().length < 2) {
            return formatDefalutResponse(400, 'Nome inválido');
        }

        if (file && !imageExtensionsAllowed.exec(file.filename)) {
            return formatDefalutResponse(400, 'Extensão informada do arquivo não é válida');
        }

        const cognitoUser = await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).signUp(email, password);

        let key = undefined;

        if (file) {
            key = await new S3Service().saveImage(AVATAR_BUCKET, 'avatar', file);

        }

        const user = {
            name,
            email,
            cognitoId: cognitoUser.userSub,
            avatar: key
        } as User;

        await UserModel.create(user);

        return formatDefalutResponse(200, 'Usuario cadastrado com sucesso, verifique seu email para confirmar o codigo!');

    } catch (error) {
        console.log('Error on register user:', error);
        return formatDefalutResponse(500, 'Erro ao cadastrar usuário! Tente novamente ou contate o administrador do sistema')
    }
}

export const confirmEmail: Handler = async (event: APIGatewayEvent): Promise<DefaultJsonResponse> => {
    try {
        const { USER_POOL_ID, USER_POOL_CLIENT_ID, error } = validateEnvs(['USER_POOL_ID', 'USER_POOL_CLIENT_ID']);

        if (error) {
            return formatDefalutResponse(500, error);
        }

        if (!event.body) {
            return formatDefalutResponse(400, 'Parâmetros de entrada não informados');
        }

        const request = JSON.parse(event.body) as ConfirmUserEmailRequest;
        const { email, code: code } = request;

        if (!email || !email.match(emailRegex)) {
            return formatDefalutResponse(400, 'Email inválido');
        }
        if (!code || code.length !== 6) {
            return formatDefalutResponse(400, 'Código de confirmação inválido');
        }

        await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).confirmEmail(email, code);
        return formatDefalutResponse(200, 'Email confirmado com sucesso!');

    } catch (e: any) {
        console.log('Error on confirm user email: ', e);
        return formatDefalutResponse(500, 'Erro ao confirmar email do usuário: ' + e);
    }
}

export const forgotPassword: Handler = async (event: APIGatewayEvent): Promise<DefaultJsonResponse> => {
    try {
        const { USER_POOL_ID, USER_POOL_CLIENT_ID, error } = validateEnvs(['USER_POOL_ID', 'USER_POOL_CLIENT_ID']);

        if (error) {
            return formatDefalutResponse(500, error);
        }

        if (!event.body) {
            return formatDefalutResponse(400, 'Parâmetros de entrada não informados');
        }

        const request = JSON.parse(event.body);
        const { email } = request;

        if (!email || !email.match(emailRegex)) {
            return formatDefalutResponse(400, 'Email inválido');
        }

        await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).forgotPassword(email);
        return formatDefalutResponse(200, 'Solicitação de troca de senha enviada com sucesso!');

    } catch (e: any) {
        console.log('Error on request forgot password: ', e);
        return formatDefalutResponse(500, 'Erro ao solicitar troca de senha do usuário: ' + e);
    }
}

export const changePassword: Handler = async (event: APIGatewayEvent): Promise<DefaultJsonResponse> => {
    try {
        const { USER_POOL_ID, USER_POOL_CLIENT_ID, error } = validateEnvs(['USER_POOL_ID', 'USER_POOL_CLIENT_ID']);

        if (error) {
            return formatDefalutResponse(500, error);
        }

        if (!event.body) {
            return formatDefalutResponse(400, 'Parâmetros de entrada não informados');
        }

        const request = JSON.parse(event.body) as ChangePasswordRequest;
        const { email, code, password } = request;

        if (!email || !email.match(emailRegex)) {
            return formatDefalutResponse(400, 'Email inválido');
        }

        if (!code || code.length !== 6) {
            return formatDefalutResponse(400, 'Código de confirmação inválido');
        }

        if (!password || !password.match(passwordRegex)) {
            return formatDefalutResponse(400, 'Senha inválida, senha deve conter pelo menos um caractér maiúsculo, minúsculo, numérico e especial, além de ter pelo menos oito dígitos.');
        }

        await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).changePassword(email, password, code);
        return formatDefalutResponse(200, 'Senha alterada com sucesso!');

    } catch (e: any) {
        console.log('Error on request forgot password: ', e);
        return formatDefalutResponse(500, 'Erro ao trocar a senha do usuário: ' + e);
    }
}