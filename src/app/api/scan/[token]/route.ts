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

    // 3. Crea (o riusa) una sessione per questo tavolo in `qr_sessions`.
    //    Il campo `token` è UNIQUE a livello di tabella, quindi non possiamo
    //    limitarci a cercare le sole sessioni attive: se esiste già una riga
    //    con questo token (magari chiusa in precedenza), un INSERT fallirebbe
    //    per violazione del vincolo unique. Cerchiamo quindi per token
    //    indipendentemente da `is_active` e la riattiviamo se serve.
    const { data: existingSession } = await supabase
      .from('qr_sessions')
      .select('id, is_active')
      .eq('token', token.toUpperCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let sessionId: string;

    if (existingSession) {
      sessionId = existingSession.id;
      if (!existingSession.is_active) {
        await supabase
          .from('qr_sessions')
          .update({
            table_id:      table.id,
            restaurant_id: table.restaurant_id,
            is_active:     true,
            last_activity: new Date().toISOString(),
          })
          .eq('id', existingSession.id);
      }
    } else {
      const { data: newSession, error: sessionError } = await supabase
        .from('qr_sessions')
        .insert({
          table_id:      table.id,
          restaurant_id: table.restaurant_id,
          token:         token.toUpperCase(),
          is_active:     true,
        })
        .select('id')
        .single();

      if (sessionError || !newSession) {
        console.error('Errore creazione qr_session:', sessionError);
        return NextResponse.json(
          { error: 'Impossibile creare la sessione' },
          { status: 500 }
        );
      }
      sessionId = newSession.id;
    }

    return NextResponse.json({
      sessionId,
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