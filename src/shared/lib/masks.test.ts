import { describe, expect, it } from 'vitest'
import { isValidPhone, maskPhone, unmaskPhone } from './masks'

describe('maskPhone', () => {
  it('formata telefone fixo de 8 digitos', () => {
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444')
  })

  it('formata celular de 9 digitos', () => {
    expect(maskPhone('11999998888')).toBe('(11) 99999-8888')
  })

  it('ignora caracteres nao numericos', () => {
    expect(maskPhone('(11) 99999-8888')).toBe('(11) 99999-8888')
  })

  it('limita a 11 digitos', () => {
    expect(maskPhone('11999998888000')).toBe('(11) 99999-8888')
  })

  it('retorna string vazia para input vazio', () => {
    expect(maskPhone('')).toBe('')
  })
})

describe('unmaskPhone', () => {
  it('remove todos os caracteres nao numericos', () => {
    expect(unmaskPhone('(11) 99999-8888')).toBe('11999998888')
  })

  it('retorna string vazia para input vazio', () => {
    expect(unmaskPhone('')).toBe('')
  })
})

describe('isValidPhone', () => {
  it('aceita telefone fixo com 10 digitos', () => {
    expect(isValidPhone('(11) 3333-4444')).toBe(true)
  })

  it('aceita celular com 11 digitos', () => {
    expect(isValidPhone('(11) 99999-8888')).toBe(true)
  })

  it('rejeita telefone com menos de 10 digitos', () => {
    expect(isValidPhone('(11) 3333-444')).toBe(false)
  })

  it('rejeita telefone com mais de 11 digitos', () => {
    expect(isValidPhone('(11) 99999-88880')).toBe(false)
  })

  it('rejeita string vazia', () => {
    expect(isValidPhone('')).toBe(false)
  })
})
