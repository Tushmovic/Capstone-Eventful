/**
 * Refund Policy Engine
 * Determines refund eligibility based on event timing and ticket status
 */

export interface RefundEligibility {
  eligible: boolean;
  refundPercentage: number;
  deadline: Date | null;
  reason: string;
}

export class RefundPolicy {
  /**
   * Check if a ticket is eligible for refund
   */
  static checkRefundEligibility(
    eventDate: Date,
    purchaseDate: Date,
    ticketStatus: string,
    eventStatus: string
  ): RefundEligibility {
    const now = new Date();
    const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysSincePurchase = Math.ceil((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));

    // Check if ticket is already used
    if (ticketStatus === 'used') {
      return {
        eligible: false,
        refundPercentage: 0,
        deadline: null,
        reason: 'Ticket has already been used',
      };
    }

    // Check if ticket is already cancelled
    if (ticketStatus === 'cancelled') {
      return {
        eligible: false,
        refundPercentage: 0,
        deadline: null,
        reason: 'Ticket is already cancelled',
      };
    }

    // Check if event is cancelled by organizer
    if (eventStatus === 'cancelled') {
      return {
        eligible: true,
        refundPercentage: 100,
        deadline: null,
        reason: 'Event cancelled by organizer - full refund',
      };
    }

    // Refund policy based on days until event
    if (daysUntilEvent > 7) {
      return {
        eligible: true,
        refundPercentage: 100,
        deadline: new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000),
        reason: 'Full refund available up to 7 days before event',
      };
    } else if (daysUntilEvent > 3) {
      return {
        eligible: true,
        refundPercentage: 50,
        deadline: new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000),
        reason: '50% refund available up to 3 days before event',
      };
    } else if (daysUntilEvent > 1) {
      return {
        eligible: true,
        refundPercentage: 25,
        deadline: new Date(eventDate.getTime() - 1 * 24 * 60 * 60 * 1000),
        reason: '25% refund available up to 1 day before event',
      };
    } else if (daysUntilEvent >= 0) {
      return {
        eligible: false,
        refundPercentage: 0,
        deadline: null,
        reason: 'Refunds not available within 24 hours of event',
      };
    } else {
      // Event already passed
      return {
        eligible: false,
        refundPercentage: 0,
        deadline: null,
        reason: 'Event has already passed',
      };
    }
  }

  /**
   * Calculate refund amount based on policy
   */
  static calculateRefundAmount(ticketPrice: number, eventDate: Date, purchaseDate: Date): {
    amount: number;
    percentage: number;
    reason: string;
  } {
    const eligibility = this.checkRefundEligibility(eventDate, purchaseDate, 'confirmed', 'published');
    
    return {
      amount: (ticketPrice * eligibility.refundPercentage) / 100,
      percentage: eligibility.refundPercentage,
      reason: eligibility.reason,
    };
  }

  /**
   * Get refund deadline display
   */
  static getRefundDeadlineDisplay(eventDate: Date): string {
    const deadlines = {
      fullRefund: new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      halfRefund: new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      quarterRefund: new Date(eventDate.getTime() - 1 * 24 * 60 * 60 * 1000),
    };

    return `
      Full refund until ${deadlines.fullRefund.toLocaleDateString()}
      50% refund until ${deadlines.halfRefund.toLocaleDateString()}
      25% refund until ${deadlines.quarterRefund.toLocaleDateString()}
    `;
  }
}

export default RefundPolicy;