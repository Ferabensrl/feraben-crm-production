import { render, screen } from '@testing-library/react'
import React from 'react'
import { ChequesView } from '../ChequesView'

describe('ChequesView access control', () => {
  it('denies access to vendors', () => {
    const currentUser = { id: 1, nombre: 'Vendedor', rol: 'vendedor' }
    render(<ChequesView currentUser={currentUser} />)
    expect(screen.getByText(/Acceso denegado/i)).toBeInTheDocument()
  })
})
