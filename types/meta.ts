// types/meta.ts

export type MetaEmbeddedSignupFinishEvent = {
  type: 'WA_EMBEDDED_SIGNUP';
  event: 'FINISH';
  data: {
    phone_number_id: string;
    waba_id: string;
    business_id?: string;
  };
};

export type MetaEmbeddedSignupErrorEvent = {
  type: 'WA_EMBEDDED_SIGNUP';
  event: 'ERROR';
  data?: Record<string, unknown>;
};

export type MetaEmbeddedSignupCancelEvent = {
  type: 'WA_EMBEDDED_SIGNUP';
  event: 'CANCEL';
  data?: Record<string, unknown>;
};

export type MetaEmbeddedSignupEvent =
  | MetaEmbeddedSignupFinishEvent
  | MetaEmbeddedSignupErrorEvent
  | MetaEmbeddedSignupCancelEvent;