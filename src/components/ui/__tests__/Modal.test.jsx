import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../Modal'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}))

describe('Modal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders title and children when open', () => {
    render(
      <Modal open={true} onClose={() => {}} title="My Modal">
        <p>Modal content</p>
      </Modal>
    )
    expect(screen.getByText('My Modal')).toBeTruthy()
    expect(screen.getByText('Modal content')).toBeTruthy()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    )
    // Backdrop is the div with bg-black/50
    const backdrop = document.querySelector('.bg-black\\/50')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    )
    // The close button has aria-label="common.close"
    const closeBtn = document.querySelector('button[aria-label]')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on Escape key', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('locks body scroll when open', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    )
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('unlocks body scroll when closed', () => {
    const { rerender } = render(
      <Modal open={true} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    )
    rerender(
      <Modal open={false} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    )
    expect(document.body.style.overflow).toBe('')
  })
})
