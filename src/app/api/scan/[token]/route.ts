// src/app/api/scan/[token]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { token } = await params;

    // 1. Cerca il tavolo nella tabella `tables` tramite il codice univoco
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('id, label, code, restaurant_id, is_active')
      .eq('code', token.toUpperCase())
      .single();

    if (tableError || !table) {
      return NextResponse.json({ error: 'Tavolo non trovato' }, { status: 404 });
    }

    if (!table.is_active) {
      return NextResponse.json({ error: 'Questo tavolo non è attivo' }, { status: 403 });
    }

    // 2. Recupera il ristorante
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('id, slug, name')
      .eq('id', table.restaurant_id)
      .single();

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Ristorante non configurato' }, { status: 500 });
    }

<<<<<<< HEAD
    // 3. Riusa la sessione attiva se esiste (stesso tavolo, più dispositivi)
    //    La sessione scade solo quando il ristorante chiude il tavolo dall'admin
    const { data: existingSession } = await supabase
      .from('qr_sessions')
      .select('id, token')
      .eq('table_id', table.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
=======
    // 3. Crea (o riusa) una sessione attiva per questo tavolo in `qr_sessions`
    //    Riusa se esiste già una sessione attiva per non creare duplicati
    const { data: existingSession } = await supabase
      .from('qr_sessions')
      .select('id')
      .eq('table_id', table.id)
      .eq('is_active', true)
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let sessionId: string;
<<<<<<< HEAD
    let sessionToken: string;

    if (existingSession) {
      // Sessione ancora valida — tutti i dispositivi al tavolo la condividono
      sessionId    = existingSession.id;
      sessionToken = existingSession.token;
    } else {
      // Nessuna sessione attiva → crea una nuova (nuovo turno / tavolo libero)
      sessionToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString(); // 45 minuti

=======

    if (existingSession) {
      sessionId = existingSession.id;
    } else {
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b
      const { data: newSession, error: sessionError } = await supabase
        .from('qr_sessions')
        .insert({
          table_id:      table.id,
          restaurant_id: table.restaurant_id,
<<<<<<< HEAD
          token:         sessionToken,
          is_active:     true,
          expires_at:    expiresAt,
=======
          token:         token.toUpperCase(),
          is_active:     true,
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b
        })
        .select('id')
        .single();

      if (sessionError || !newSession) {
<<<<<<< HEAD
=======
        // qr_sessions potrebbe non esistere — usa l'id del tavolo come sessionId
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b
        sessionId = table.id;
      } else {
        sessionId = newSession.id;
      }
    }

    return NextResponse.json({
      sessionId,
<<<<<<< HEAD
      sessionToken,          // UUID monouso da usare come x-session-token
=======
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b
      restaurantId:   restaurant.id,
      restaurantSlug: restaurant.slug ?? restaurant.name,
      tableId:        table.id,
      tableNumber:    table.label,  // es. "Terrazza A"
      tableCode:      table.code,   // es. "TERR-9QOF"
    });

  } catch (error: any) {
    console.error('Errore API Scan:', error);
    return NextResponse.json(
      { error: 'Errore interno del server', details: error.message },
      { status: 500 }
    );
  }
}