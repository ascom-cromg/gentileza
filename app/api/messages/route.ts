import { json } from '@/lib/correio/server';
export async function GET() { return json({error:'O mural foi encerrado. As gentilezas agora são enviadas exclusivamente por e-mail.'},410); }
export async function POST() { return GET(); }
