import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Badge from '../Badge'

describe('Badge', () => {
  it('renders status text when no label', () => {
    render(<Badge status="Active" />)
    expect(screen.getByText('Active')).toBeTruthy()
  })

  it('renders label when provided', () => {
    render(<Badge status="Pending" label="En espera" />)
    expect(screen.getByText('En espera')).toBeTruthy()
  })

  it('applies green classes for Active status', () => {
    render(<Badge status="Active" />)
    expect(screen.getByText('Active').className).toContain('bg-green-100')
  })

  it('applies red classes for Rejected status', () => {
    render(<Badge status="Rejected" />)
    expect(screen.getByText('Rejected').className).toContain('bg-red-100')
  })

  it('applies blue classes for Pending status', () => {
    render(<Badge status="Pending" />)
    expect(screen.getByText('Pending').className).toContain('bg-blue-100')
  })

  it('applies fallback gray for unknown status', () => {
    render(<Badge status="Unknown" />)
    expect(screen.getByText('Unknown').className).toContain('bg-gray-100')
  })

  it('renders as a span element', () => {
    render(<Badge status="Hired" />)
    expect(screen.getByText('Hired').tagName).toBe('SPAN')
  })
})
