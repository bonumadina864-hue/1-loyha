import { DevLoginModule } from '../src/modules/dev-login/dev-login.module';

describe('DevLoginModule Physical Exclusion', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should register DevLoginController in development when enabled', () => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_LOGIN = 'true';

    const registered = DevLoginModule.register();
    expect(registered.controllers).toBeDefined();
    expect(registered.controllers?.length).toBe(1);
  });

  it('should NOT register DevLoginController in production even if ENABLE_DEV_LOGIN is true', () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEV_LOGIN = 'true';

    const registered = DevLoginModule.register();
    expect(registered.controllers).toBeDefined();
    expect(registered.controllers?.length).toBe(0);
  });

  it('should NOT register DevLoginController in development if ENABLE_DEV_LOGIN is false', () => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_LOGIN = 'false';

    const registered = DevLoginModule.register();
    expect(registered.controllers).toBeDefined();
    expect(registered.controllers?.length).toBe(0);
  });
});
