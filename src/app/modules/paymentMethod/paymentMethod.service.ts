import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { stripe } from '../../../config/stripe';

const getPaymentMethods = async (studentId: string) => {
  const student = await User.findById(studentId);
  if (!student || student.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only students can access payment methods');
  }

  const stripeCustomerId = student.studentProfile?.stripeCustomerId;
  if (!stripeCustomerId) {
    return { paymentMethods: [], defaultPaymentMethodId: null };
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: 'card',
  });

  const customer = await stripe.customers.retrieve(stripeCustomerId);
  const defaultPaymentMethodId =
    (customer as any).invoice_settings?.default_payment_method || null;

  return {
    paymentMethods: paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand || 'unknown',
      last4: pm.card?.last4 || '****',
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
      isDefault: pm.id === defaultPaymentMethodId,
    })),
    defaultPaymentMethodId,
  };
};

const createSetupIntent = async (studentId: string) => {
  const student = await User.findById(studentId);
  if (!student || student.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only students can add payment methods');
  }

  let stripeCustomerId = student.studentProfile?.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: student.email,
      name: student.name,
      metadata: { userId: studentId },
    });
    stripeCustomerId = customer.id;

    if (student.studentProfile) {
      await User.findByIdAndUpdate(studentId, {
        'studentProfile.stripeCustomerId': stripeCustomerId,
      });
    } else {

      await User.findByIdAndUpdate(studentId, {
        studentProfile: {
          stripeCustomerId: stripeCustomerId,
        },
      });
    }
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    metadata: { studentId },
  });

  return {
    clientSecret: setupIntent.client_secret,
    setupIntentId: setupIntent.id,
  };
};

const attachPaymentMethod = async (
  studentId: string,
  paymentMethodId: string,
  setAsDefault: boolean = false
) => {
  const student = await User.findById(studentId);
  if (!student || student.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only students can add payment methods');
  }

  const stripeCustomerId = student.studentProfile?.stripeCustomerId;
  if (!stripeCustomerId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No Stripe customer found');
  }

  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: stripeCustomerId,
  });

  if (setAsDefault) {
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

  return {
    id: paymentMethod.id,
    brand: paymentMethod.card?.brand || 'unknown',
    last4: paymentMethod.card?.last4 || '****',
    expMonth: paymentMethod.card?.exp_month,
    expYear: paymentMethod.card?.exp_year,
    isDefault: setAsDefault,
  };
};

const setDefaultPaymentMethod = async (studentId: string, paymentMethodId: string) => {
  const student = await User.findById(studentId);
  if (!student || student.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only students can manage payment methods');
  }

  const stripeCustomerId = student.studentProfile?.stripeCustomerId;
  if (!stripeCustomerId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No Stripe customer found');
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (paymentMethod.customer !== stripeCustomerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Payment method does not belong to this customer');
  }

  await stripe.customers.update(stripeCustomerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  return { success: true, defaultPaymentMethodId: paymentMethodId };
};

const deletePaymentMethod = async (studentId: string, paymentMethodId: string) => {
  const student = await User.findById(studentId);
  if (!student || student.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only students can manage payment methods');
  }

  const stripeCustomerId = student.studentProfile?.stripeCustomerId;
  if (!stripeCustomerId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No Stripe customer found');
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (paymentMethod.customer !== stripeCustomerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Payment method does not belong to this customer');
  }

  await stripe.paymentMethods.detach(paymentMethodId);

  return { success: true, deletedPaymentMethodId: paymentMethodId };
};

export const PaymentMethodService = {
  getPaymentMethods,
  createSetupIntent,
  attachPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
};
