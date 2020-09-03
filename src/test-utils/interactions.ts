import { fireEvent } from '@testing-library/react'
import { disposables } from '../utils/disposables'

export const Keys: Record<string, Partial<KeyboardEvent>> = {
  Space: { key: ' ' },
  Enter: { key: 'Enter' },
  Escape: { key: 'Escape' },
  Backspace: { key: 'Backspace' },

  ArrowUp: { key: 'ArrowUp' },
  ArrowRight: { key: 'ArrowRight' },
  ArrowDown: { key: 'ArrowDown' },
  ArrowLeft: { key: 'ArrowLeft' },

  Home: { key: 'Home' },
  End: { key: 'End' },

  Tab: { key: 'Tab' },
  ShiftTab: { key: 'Tab', shiftKey: true },
}

export function word(input: string): Partial<KeyboardEvent>[] {
  return input.split('').map(key => ({ key }))
}

export async function type(events: Partial<KeyboardEvent>[]) {
  jest.useFakeTimers()

  try {
    if (document.activeElement === null) return expect(document.activeElement).not.toBe(null)

    const element = document.activeElement
    const d = disposables()

    events.forEach(event => {
      fireEvent.keyDown(element, event)
    })

    // We have to wait for the "clear" event
    const p = new Promise(resolve => d.setTimeout(resolve, 350))

    // We don't want to actually wait in our tests, so let's advance
    jest.runAllTimers()

    await p
    await new Promise(d.nextFrame)
  } catch (err) {
    if (Error.captureStackTrace) {
      Error.captureStackTrace(err, type)
    }
    throw err
  } finally {
    jest.useRealTimers()
  }
}

export async function press(event: Partial<KeyboardEvent>) {
  return type([event])
}

export async function click(element: Document | Element | Window | Node | null) {
  try {
    if (element === null) return expect(element).not.toBe(null)

    const d = disposables()

    fireEvent.pointerDown(element)
    fireEvent.mouseDown(element)
    fireEvent.pointerUp(element)
    fireEvent.mouseUp(element)
    fireEvent.click(element)

    await new Promise(d.nextFrame)
  } catch (err) {
    if (Error.captureStackTrace) {
      Error.captureStackTrace(err, click)
    }
    throw err
  }
}

export async function hover(element: Document | Element | Window | Node | null) {
  try {
    if (element === null) return expect(element).not.toBe(null)

    const d = disposables()

    fireEvent.pointerOver(element)
    fireEvent.pointerEnter(element)
    fireEvent.mouseOver(element)

    await new Promise(d.nextFrame)
  } catch (err) {
    if (Error.captureStackTrace) {
      Error.captureStackTrace(err, hover)
    }
    throw err
  }
}

export async function unHover(element: Document | Element | Window | Node | null) {
  try {
    if (element === null) return expect(element).not.toBe(null)

    const d = disposables()

    fireEvent.pointerOut(element)
    fireEvent.pointerLeave(element)
    fireEvent.mouseOut(element)
    fireEvent.mouseLeave(element)

    await new Promise(d.nextFrame)
  } catch (err) {
    if (Error.captureStackTrace) {
      Error.captureStackTrace(err, hover)
    }
    throw err
  }
}
