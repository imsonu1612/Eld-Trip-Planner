import { DailyLog } from '../types';

export class ELDCanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 816;
  private height: number = 1056;
  
  // Colors
  private colorBlack = '#000000';
  private colorGray = '#CCCCCC';
  private colorWhite = '#FFFFFF';
  private colorDarkGray = '#333333';
  
  // Fonts
  private fontSmall = '10px monospace';
  private fontNormal = '12px monospace';
  private fontBold = '12px monospace';
  private fontLarge = '14px monospace';
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    
    // White background
    this.ctx.fillStyle = this.colorWhite;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
  
  render(dailyLog: DailyLog): void {
    let y = 20;
    
    // Header
    y = this.drawHeader(dailyLog, y);
    y += 20;
    
    // 24-hour grid
    y = this.drawGrid(dailyLog, y);
    y += 20;
    
    // Remarks
    y = this.drawRemarks(dailyLog, y);
    y += 20;
    
    // Recap
    this.drawRecap(dailyLog, y);
  }
  
  private drawHeader(log: DailyLog, y: number): number {
    const margin = 20;
    
    // Title
    this.ctx.font = this.fontLarge;
    this.ctx.fillStyle = this.colorBlack;
    this.ctx.fillText('DRIVER\'S DAILY LOG', margin, y);
    y += 20;
    
    // Date and locations
    this.ctx.font = this.fontNormal;
    this.ctx.fillText(`Date: ${log.date}`, margin, y);
    y += 15;
    
    this.ctx.fillText(`From: ${log.from_location}`, margin, y);
    y += 15;
    
    this.ctx.fillText(`To: ${log.to_location}`, margin, y);
    y += 15;
    
    this.ctx.fillText(`Total Miles: ${log.total_miles_today.toFixed(1)}`, margin, y);
    y += 15;
    
    this.ctx.fillText('Carrier: ELD Trip Planner', margin, y);
    y += 15;
    
    return y;
  }
  
  private drawGrid(log: DailyLog, y: number): number {
    const margin = 20;
    const gridWidth = this.width - margin * 2;
    const gridHeight = 200;
    const hourWidth = gridWidth / 24;
    const rowHeight = gridHeight / 4;
    
    const statusNames = ['Off Duty', 'Sleeper Berth', 'Driving', 'On Duty (Not Driving)'];
    const statusKeys: Array<'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty_not_driving'> = [
      'off_duty',
      'sleeper_berth',
      'driving',
      'on_duty_not_driving'
    ];
    
    // Draw row labels
    this.ctx.font = this.fontSmall;
    statusNames.forEach((name, i) => {
      this.ctx.fillText(name, margin - 15, y + rowHeight * (i + 0.5) + 5);
    });
    
    // Draw grid
    this.ctx.strokeStyle = this.colorGray;
    this.ctx.lineWidth = 1;
    
    // Vertical lines (hours)
    for (let h = 0; h <= 24; h++) {
      const x = margin + h * hourWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x, y + gridHeight);
      this.ctx.stroke();
    }
    
    // Horizontal lines (status rows)
    for (let r = 0; r <= 4; r++) {
      const rowY = y + r * rowHeight;
      this.ctx.beginPath();
      this.ctx.moveTo(margin, rowY);
      this.ctx.lineTo(margin + gridWidth, rowY);
      this.ctx.stroke();
    }
    
    // Draw hour labels
    this.ctx.font = this.fontSmall;
    this.ctx.fillStyle = this.colorDarkGray;
    for (let h = 0; h <= 24; h += 4) {
      const x = margin + h * hourWidth;
      this.ctx.fillText(`${h}:00`, x, y - 5);
    }
    
    // Draw segments
    this.ctx.strokeStyle = this.colorBlack;
    this.ctx.lineWidth = 3;
    this.ctx.fillStyle = this.colorBlack;
    
    log.segments.forEach(segment => {
      const rowIndex = statusKeys.indexOf(segment.status as any);
      if (rowIndex === -1) return;
      
      const startHour = this.timeToHour(segment.start_time);
      const endHour = this.timeToHour(segment.end_time);
      
      const x1 = margin + startHour * hourWidth;
      const x2 = margin + endHour * hourWidth;
      const segmentY = y + (rowIndex + 0.5) * rowHeight;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x1, segmentY);
      this.ctx.lineTo(x2, segmentY);
      this.ctx.stroke();
    });
    
    // Draw totals
    this.ctx.font = this.fontSmall;
    this.ctx.fillStyle = this.colorBlack;
    const totalsX = margin + gridWidth + 10;
    
    statusKeys.forEach((key, i) => {
      const total = log.totals[key];
      const rowY = y + (i + 0.5) * rowHeight + 5;
      this.ctx.fillText(`${total.toFixed(1)}h`, totalsX, rowY);
    });
    
    return y + gridHeight;
  }
  
  private drawRemarks(log: DailyLog, y: number): number {
    const margin = 20;
    
    this.ctx.font = this.fontBold;
    this.ctx.fillStyle = this.colorBlack;
    this.ctx.fillText('REMARKS:', margin, y);
    y += 15;
    
    this.ctx.font = this.fontSmall;
    log.remarks.slice(0, 5).forEach(remark => {
      this.ctx.fillText(remark, margin + 10, y);
      y += 12;
    });
    
    return y;
  }
  
  private drawRecap(log: DailyLog, y: number): void {
    const margin = 20;
    
    this.ctx.font = this.fontBold;
    this.ctx.fillStyle = this.colorBlack;
    this.ctx.fillText('70-HOUR RECAP:', margin, y);
    y += 15;
    
    this.ctx.font = this.fontSmall;
    this.ctx.fillText(`On Duty Today: ${log.recap.on_duty_today.toFixed(1)}h`, margin + 10, y);
    y += 12;
    
    this.ctx.fillText(`Total Last 7 Days: ${log.recap.total_last_7_days.toFixed(1)}h`, margin + 10, y);
    y += 12;
    
    this.ctx.fillText(`Available Tomorrow: ${log.recap.available_tomorrow.toFixed(1)}h`, margin + 10, y);
  }
  
  private timeToHour(timeStr: string): number {
    try {
      const parts = timeStr.split('T')[1].split(':');
      return parseInt(parts[0]) + parseInt(parts[1]) / 60;
    } catch {
      return 0;
    }
  }
  
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
  
  downloadPNG(filename: string): void {
    const link = document.createElement('a');
    link.href = this.canvas.toDataURL('image/png');
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
