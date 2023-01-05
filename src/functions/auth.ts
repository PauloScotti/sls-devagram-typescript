import type { Handler, APIGatewayEvent } from 'aws-lambda';
import { passwordRegex, emailRegex } from '../constants/Regexes';
import { CognitoServices } from '../services/CognitoServices';
import { UserRegisterRequest } from '../types/auth/UserRegisterRequest';
import { ConfirmUserEmailRequest } from '../types/auth/ConfirmUserEmailRequest';
import { DefaultJsonResponse, formatDefalutResponse } from '../utils/formatResponseUtils';

export const register: Handler = async (event: APIGatewayEvent): Promise<DefaultJsonResponse> => {
    try {
        const { USER_POOL_ID, USER_POOL_CLIENT_ID } = process.env;
        if (!USER_POOL_ID || !USER_POOL_CLIENT_ID) {
            return formatDefalutResponse(500, 'Cognito Environments não encontradas');
        }
        if (!event.body) {
            return formatDefalutResponse(400, 'Parâmetros de entrada não informados');
        }
        const request = JSON.parse(event.body) as UserRegisterRequest;
        const { email, password, name } = request;
        if (!email || !email.match(emailRegex)) {
            return formatDefalutResponse(400, 'Email inválido');
        }
        if (!password || !password.match(passwordRegex)) {
            return formatDefalutResponse(400, 'Senha inválida, senha deve conter pelo menos um caractér maiúsculo, minúsculo, numérico e especial, além de ter pelo menos oito dígitos.');
        }
        if (!name || name.trim().length < 2) {
            return formatDefalutResponse(400, 'Nome inválido');
        }

        await new CognitoServices(USER_POOL_ID, USER_POOL_CLIENT_ID).signUp(email, password);
        return formatDefalutResponse(200, 'Usuario cadastrado com sucesso, verifique seu email para confirmar o codigo!');
        
    } catch (error) {
        console.log('Error on register user:', error);
        return formatDefalutResponse(500, 'Erro ao cadastrar usuário! Tente novamente ou contate o administrador do sistema')
    }
}

export const confirmEmail: Handler = async (event: APIGatewayEvent): Promise<DefaultJsonResponse> => {
    try {
         const { USER_POOL_ID, USER_POOL_CLIENT_ID } = process.env;
         if (!USER_POOL_ID || !USER_POOL_CLIENT_ID) {
              return formatDefalutResponse(500, 'Cognito Environments não encontradas');
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