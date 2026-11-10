/**
 * Easing Functions
 * Phase 7: Build the Game - Animation Easing
 */

/**
 * Standard easing functions for smooth animations
 */
export const Easing = {
  /**
   * No easing - linear interpolation
   */
  linear(t: number): number {
    return t
  },

  /**
   * Ease in - starts slow, ends fast
   */
  easeInQuad(t: number): number {
    return t * t
  },

  /**
   * Ease out - starts fast, ends slow
   */
  easeOutQuad(t: number): number {
    return t * (2 - t)
  },

  /**
   * Ease in out - starts slow, fast in middle, ends slow
   */
  easeInOutQuad(t: number): number {
    if (t < 0.5) return 2 * t * t
    return -1 + (4 - 2 * t) * t
  },

  /**
   * Ease in cubic
   */
  easeInCubic(t: number): number {
    return t * t * t
  },

  /**
   * Ease out cubic
   */
  easeOutCubic(t: number): number {
    return (--t) * t * t + 1
  },

  /**
   * Ease in out cubic
   */
  easeInOutCubic(t: number): number {
    if (t < 0.5) return 4 * t * t * t
    return (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
  },

  /**
   * Ease in quart
   */
  easeInQuart(t: number): number {
    return t * t * t * t
  },

  /**
   * Ease out quart
   */
  easeOutQuart(t: number): number {
    return 1 - (--t) * t * t * t
  },

  /**
   * Ease in out quart
   */
  easeInOutQuart(t: number): number {
    if (t < 0.5) return 8 * t * t * t * t
    return 1 - 8 * (--t) * t * t * t
  },

  /**
   * Ease in quint
   */
  easeInQuint(t: number): number {
    return t * t * t * t * t
  },

  /**
   * Ease out quint
   */
  easeOutQuint(t: number): number {
    return 1 + (--t) * t * t * t * t
  },

  /**
   * Ease in out quint
   */
  easeInOutQuint(t: number): number {
    if (t < 0.5) return 16 * t * t * t * t * t
    return 1 + 16 * (--t) * t * t * t * t
  },

  /**
   * Ease in sine
   */
  easeInSine(t: number): number {
    return 1 - Math.cos((t * Math.PI) / 2)
  },

  /**
   * Ease out sine
   */
  easeOutSine(t: number): number {
    return Math.sin((t * Math.PI) / 2)
  },

  /**
   * Ease in out sine
   */
  easeInOutSine(t: number): number {
    return -0.5 * (Math.cos(t * Math.PI) - 1)
  },

  /**
   * Ease in exponential
   */
  easeInExpo(t: number): number {
    return t === 0 ? 0 : Math.pow(2, 10 * t - 10)
  },

  /**
   * Ease out exponential
   */
  easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
  },

  /**
   * Ease in out exponential
   */
  easeInOutExpo(t: number): number {
    if (t === 0) return 0
    if (t === 1) return 1
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2
    return (2 - Math.pow(2, -20 * t + 10)) / 2
  },

  /**
   * Ease in circular
   */
  easeInCirc(t: number): number {
    return 1 - Math.sqrt(1 - t * t)
  },

  /**
   * Ease out circular
   */
  easeOutCirc(t: number): number {
    return Math.sqrt(1 - (t - 1) * (t - 1))
  },

  /**
   * Ease in out circular
   */
  easeInOutCirc(t: number): number {
    if (t < 0.5) return (1 - Math.sqrt(1 - 4 * t * t)) / 2
    return (Math.sqrt(1 - 4 * (t - 1) * (t - 1)) + 1) / 2
  },

  /**
   * Ease in back
   */
  easeInBack(t: number): number {
    const c1 = 1.70158
    const c3 = c1 + 1
    return c3 * t * t * t - c1 * t * t
  },

  /**
   * Ease out back
   */
  easeOutBack(t: number): number {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },

  /**
   * Ease in out back
   */
  easeInOutBack(t: number): number {
    const c1 = 1.70158
    const c2 = c1 * 1.525
    if (t < 0.5) {
      return (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    }
    return (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
  },

  /**
   * Ease out elastic
   */
  easeOutElastic(t: number): number {
    const c5 = (2 * Math.PI) / 4.5
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c5) + 1
  },

  /**
   * Ease in elastic
   */
  easeInElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4)
  },

  /**
   * Ease in out elastic
   */
  easeInOutElastic(t: number): number {
    const c5 = (2 * Math.PI) / 4.5
    if (t === 0) return 0
    if (t === 1) return 1
    if (t < 0.5) {
      return -0.5 * Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)
    }
    return 0.5 * Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5) + 1
  },

  /**
   * Ease in bounce
   */
  easeInBounce(t: number): number {
    return 1 - this.easeOutBounce(1 - t)
  },

  /**
   * Ease out bounce
   */
  easeOutBounce(t: number): number {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
    }
  },

  /**
   * Ease in out bounce
   */
  easeInOutBounce(t: number): number {
    if (t < 0.5) return this.easeInBounce(t * 2) * 0.5
    return this.easeOutBounce(t * 2 - 1) * 0.5 + 0.5
  },

  /**
   * Get easing function by name
   */
  getEasing(name: string): (t: number) => number {
    const easingMap: Record<string, (t: number) => number> = {
      linear: this.linear,
      easeInQuad: this.easeInQuad,
      easeOutQuad: this.easeOutQuad,
      easeInOutQuad: this.easeInOutQuad,
      easeInCubic: this.easeInCubic,
      easeOutCubic: this.easeOutCubic,
      easeInOutCubic: this.easeInOutCubic,
      easeInQuart: this.easeInQuart,
      easeOutQuart: this.easeOutQuart,
      easeInOutQuart: this.easeInOutQuart,
      easeInQuint: this.easeInQuint,
      easeOutQuint: this.easeOutQuint,
      easeInOutQuint: this.easeInOutQuint,
      easeInSine: this.easeInSine,
      easeOutSine: this.easeOutSine,
      easeInOutSine: this.easeInOutSine,
      easeInExpo: this.easeInExpo,
      easeOutExpo: this.easeOutExpo,
      easeInOutExpo: this.easeInOutExpo,
      easeInCirc: this.easeInCirc,
      easeOutCirc: this.easeOutCirc,
      easeInOutCirc: this.easeInOutCirc,
      easeInBack: this.easeInBack,
      easeOutBack: this.easeOutBack,
      easeInOutBack: this.easeInOutBack,
      easeInElastic: this.easeInElastic,
      easeOutElastic: this.easeOutElastic,
      easeInOutElastic: this.easeInOutElastic,
      easeInBounce: this.easeInBounce,
      easeOutBounce: this.easeOutBounce,
      easeInOutBounce: this.easeInOutBounce
    }
    return easingMap[name] || this.linear
  }
}

export default Easing
