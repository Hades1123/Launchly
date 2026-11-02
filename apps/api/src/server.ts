import 'dotenv/config';
import { createApp } from '@/app';
import { env } from '@/lib/env';

createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
