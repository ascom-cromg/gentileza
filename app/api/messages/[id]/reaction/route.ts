import { json } from '@/lib/correio/server';
export async function POST() { return json({error:'O mural foi encerrado.'},410); }
