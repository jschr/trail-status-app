import { env } from '@hydrocut-trail-status/utilities';

export default (val: string) => `${env('PROJECT')}-${val}`
