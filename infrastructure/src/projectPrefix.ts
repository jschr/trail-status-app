import { env } from '@trail-status-app/utilities';

export default (val: string) => `${env('PROJECT')}-${val}`
