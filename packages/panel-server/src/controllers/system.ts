import { type Request, type Response } from 'express';
import { Controller, Get } from '@observerx/server-util';
import osu from 'node-os-utils';
import prettyBytes from 'pretty-bytes';

function mbToBytes(mb: number) {
  return mb * 1024 * 1024;
}

function gbToBytes(gb: number) {
  return gb * 1024 * 1024 * 1024;
}

@Controller('/system')
export default class SystemController {
  @Get('/status')
  public async getMessages(req: Request, res: Response) {
    try {
      const cpuUsage = await osu.cpu.usage();
      const cpuCount = osu.cpu.count();
      const cpuModel = osu.cpu.model();
      const memInfo = await osu.mem.info();
      const driveInfo = await osu.drive.info('/');
      return res.json({
        cpu: {
          usage: cpuUsage,
          count: cpuCount,
          model: cpuModel,
        },
        mem: {
          usage: memInfo.usedMemPercentage,
          total: prettyBytes(mbToBytes(memInfo.totalMemMb), {
            binary: true,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          used: prettyBytes(mbToBytes(memInfo.usedMemMb), {
            binary: true,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
        drive: {
          usage: parseFloat(driveInfo.usedPercentage),
          total: prettyBytes(gbToBytes(parseInt(driveInfo.totalGb, 10)), {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          used: prettyBytes(gbToBytes(parseInt(driveInfo.usedGb, 10)), {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
        os: await osu.os.oos(),
        ip: osu.os.ip(),
        hostname: osu.os.hostname(),
      });
    } catch (e) {
      return res.json({
        status: 'error',
        message: e.toString(),
      });
    }
  }
}
