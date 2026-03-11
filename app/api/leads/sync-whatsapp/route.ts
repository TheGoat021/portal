import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type ConversationRow = {
  id: string
  phone: string | null
  name: string | null
  email: string | null
}

type ClienteRow = {
  id: string
  nome: string | null
  telefone: string | null
  email: string | null
}

function normalizePhone(phone?: string | null) {
  if (!phone) return ''
  return String(phone).replace(/\D/g, '')
}

export async function POST() {
  try {
    const { data: origem, error: origemError } = await supabaseAdmin
      .from('origens')
      .select('id, nome, plataforma')
      .ilike('nome', '%whatsapp%')
      .limit(1)
      .maybeSingle()

    if (origemError) {
      console.error('❌ Erro ao buscar origem WhatsApp:', origemError)

      return NextResponse.json(
        { error: origemError.message },
        { status: 500 }
      )
    }

    if (!origem) {
      return NextResponse.json(
        {
          error:
            'Origem WhatsApp não encontrada. Crie uma origem com nome "WhatsApp".'
        },
        { status: 400 }
      )
    }

    const { data: conversations, error: conversationsError } = await supabaseAdmin
      .from('conversations')
      .select('id, phone, name, email')
      .order('created_at', { ascending: false })

    if (conversationsError) {
      console.error('❌ Erro ao buscar conversations:', conversationsError)

      return NextResponse.json(
        { error: conversationsError.message },
        { status: 500 }
      )
    }

    const validConversations = ((conversations ?? []) as ConversationRow[]).filter(
      (conversation) => !!normalizePhone(conversation.phone)
    )

    if (validConversations.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        skipped: 0,
        totalConversations: 0,
        pendingToSync: 0,
        message: 'Nenhuma conversa válida encontrada para sincronizar.',
        errors: []
      })
    }

    const conversationIds = validConversations.map((conversation) => conversation.id)

    const { data: existingLeads, error: existingLeadsError } = await supabaseAdmin
      .from('leads')
      .select('id, conversation_id')
      .in('conversation_id', conversationIds)

    if (existingLeadsError) {
      console.error(
        '❌ Erro ao buscar leads existentes por conversation_id:',
        existingLeadsError
      )

      return NextResponse.json(
        { error: existingLeadsError.message },
        { status: 500 }
      )
    }

    const existingConversationIds = new Set(
      (existingLeads ?? [])
        .map((lead: { conversation_id: string | null }) => lead.conversation_id)
        .filter(Boolean)
    )

    const conversationsToSync = validConversations.filter(
      (conversation) => !existingConversationIds.has(conversation.id)
    )

    if (conversationsToSync.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        skipped: validConversations.length,
        totalConversations: validConversations.length,
        pendingToSync: 0,
        message: 'Todas as conversas já estão sincronizadas com leads.',
        errors: []
      })
    }

    const { data: clientesExistentes, error: clientesExistentesError } =
      await supabaseAdmin
        .from('clientes')
        .select('id, nome, telefone, email')

    if (clientesExistentesError) {
      console.error('❌ Erro ao buscar clientes existentes:', clientesExistentesError)

      return NextResponse.json(
        { error: clientesExistentesError.message },
        { status: 500 }
      )
    }

    const clientesByPhone = new Map<string, ClienteRow>()

    for (const cliente of (clientesExistentes ?? []) as ClienteRow[]) {
      const normalized = normalizePhone(cliente.telefone)
      if (normalized) {
        clientesByPhone.set(normalized, cliente)
      }
    }

    let created = 0
    let skipped = 0
    const errors: Array<{ conversationId: string; error: string }> = []

    for (const conversation of conversationsToSync) {
      try {
        const normalizedPhone = normalizePhone(conversation.phone)

        if (!normalizedPhone) {
          skipped++
          continue
        }

        let cliente = clientesByPhone.get(normalizedPhone)

        if (!cliente) {
          const { data: novoCliente, error: novoClienteError } = await supabaseAdmin
            .from('clientes')
            .insert({
              nome: conversation.name?.trim() || 'Sem nome',
              telefone: normalizedPhone,
              email: conversation.email?.trim() || null
            })
            .select('id, nome, telefone, email')
            .single()

          if (novoClienteError || !novoCliente) {
            errors.push({
              conversationId: conversation.id,
              error: novoClienteError?.message || 'Erro ao criar cliente'
            })
            continue
          }

          cliente = novoCliente
          clientesByPhone.set(normalizedPhone, cliente)
        } else {
          const shouldUpdateNome =
            (!cliente.nome || cliente.nome === 'Sem nome') &&
            !!conversation.name?.trim()

          const shouldUpdateEmail =
            !cliente.email && !!conversation.email?.trim()

          if (shouldUpdateNome || shouldUpdateEmail) {
            const { data: clienteAtualizado, error: clienteAtualizadoError } =
              await supabaseAdmin
                .from('clientes')
                .update({
                  ...(shouldUpdateNome ? { nome: conversation.name?.trim() } : {}),
                  ...(shouldUpdateEmail ? { email: conversation.email?.trim() } : {})
                })
                .eq('id', cliente.id)
                .select('id, nome, telefone, email')
                .maybeSingle()

            if (clienteAtualizadoError) {
              errors.push({
                conversationId: conversation.id,
                error: clienteAtualizadoError.message
              })
              continue
            }

            if (clienteAtualizado) {
              cliente = clienteAtualizado
              clientesByPhone.set(normalizedPhone, cliente)
            }
          }
        }

        const { error: leadError } = await supabaseAdmin
          .from('leads')
          .insert({
            cliente_id: cliente.id,
            origem_id: origem.id,
            conversation_id: conversation.id,
            status: 'novo',
            plataforma: 'manual'
          })

        if (leadError) {
          console.error('❌ Erro ao criar lead da conversa:', {
            conversationId: conversation.id,
            phone: normalizedPhone,
            error: leadError
          })

          errors.push({
            conversationId: conversation.id,
            error: leadError.message
          })
          continue
        }

        created++
      } catch (error: any) {
        console.error('❌ Erro inesperado ao sincronizar conversa:', {
          conversationId: conversation.id,
          error
        })

        errors.push({
          conversationId: conversation.id,
          error: error?.message || 'Erro inesperado ao sincronizar conversa'
        })
      }
    }

    console.log('✅ Sync WhatsApp finalizada:', {
      totalConversations: validConversations.length,
      pendingToSync: conversationsToSync.length,
      created,
      skipped,
      errorsCount: errors.length
    })

    return NextResponse.json({
      success: errors.length === 0,
      created,
      skipped,
      totalConversations: validConversations.length,
      pendingToSync: conversationsToSync.length,
      errors
    })
  } catch (error: any) {
    console.error('❌ Erro ao sincronizar leads do WhatsApp:', error)

    return NextResponse.json(
      {
        error: error?.message || 'Erro interno ao sincronizar leads do WhatsApp'
      },
      { status: 500 }
    )
  }
}