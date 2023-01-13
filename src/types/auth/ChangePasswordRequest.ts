import type { ConfirmUserEmailRequest } from './ConfirmUserEmailRequest';

export type ChangePasswordRequest = ConfirmUserEmailRequest & {
    password: string
}