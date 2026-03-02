import type { IMarketService } from './IMarketService'
import type { Stock } from '../types'

const PSE_STOCKS: Stock[] = [
  { ticker: 'SM',    name: 'SM Investments Corp.',        price: 912.00,  change: 12.00,  changePct: 1.33,  volume: 1_245_300 },
  { ticker: 'ALI',   name: 'Ayala Land Inc.',              price: 28.50,   change: -0.40,  changePct: -1.38, volume: 3_102_500 },
  { ticker: 'BDO',   name: 'BDO Unibank Inc.',             price: 148.90,  change: 2.10,   changePct: 1.43,  volume: 876_400  },
  { ticker: 'JFC',   name: 'Jollibee Foods Corp.',         price: 218.00,  change: -3.00,  changePct: -1.36, volume: 654_200  },
  { ticker: 'SMPH',  name: 'SM Prime Holdings Inc.',       price: 34.20,   change: 0.60,   changePct: 1.79,  volume: 4_521_000 },
  { ticker: 'AC',    name: 'Ayala Corporation',            price: 698.00,  change: 8.00,   changePct: 1.16,  volume: 321_700  },
  { ticker: 'URC',   name: 'Universal Robina Corp.',       price: 112.50,  change: -1.50,  changePct: -1.32, volume: 1_098_600 },
  { ticker: 'GLO',   name: 'Globe Telecom Inc.',           price: 1_880.00, change: 30.00, changePct: 1.62,  volume: 89_300   },
  { ticker: 'TEL',   name: 'PLDT Inc.',                    price: 1_350.00, change: -20.00, changePct: -1.46, volume: 102_400 },
  { ticker: 'MER',   name: 'Manila Electric Company',      price: 325.00,  change: 5.00,   changePct: 1.56,  volume: 243_800  },
  { ticker: 'AEV',   name: 'Aboitiz Equity Ventures Inc.',price: 68.50,   change: 1.20,   changePct: 1.78,  volume: 562_900  },
  { ticker: 'GTCAP', name: 'GT Capital Holdings Inc.',     price: 518.00,  change: -8.00,  changePct: -1.52, volume: 78_600   },
  { ticker: 'MBT',   name: 'Metropolitan Bank & Trust Co.',price: 62.45,  change: 0.95,   changePct: 1.55,  volume: 1_432_100 },
  { ticker: 'ICT',   name: 'International Container Terminal Services Inc.',price: 310.00, change: 4.50, changePct: 1.47, volume: 195_300 },
  { ticker: 'RLC',   name: 'Robinsons Land Corp.',         price: 16.80,   change: -0.20,  changePct: -1.18, volume: 876_500  },
  { ticker: 'SECB',  name: 'Security Bank Corp.',          price: 94.10,   change: 1.40,   changePct: 1.51,  volume: 324_600  },
  { ticker: 'DMC',   name: 'DMCI Holdings Inc.',           price: 10.80,   change: 0.30,   changePct: 2.86,  volume: 2_341_200 },
  { ticker: 'PGOLD', name: 'Puregold Price Club Inc.',     price: 33.60,   change: -0.50,  changePct: -1.47, volume: 876_400  },
  { ticker: 'EMP',   name: 'Emperador Inc.',               price: 19.50,   change: 0.50,   changePct: 2.63,  volume: 3_456_700 },
  { ticker: 'AGI',   name: 'Alliance Global Group Inc.',   price: 12.20,   change: 0.20,   changePct: 1.67,  volume: 1_234_500 },
]

export class MockMarketService implements IMarketService {
  async getStocks(): Promise<Stock[]> {
    // Simulate slight random price fluctuations on each refresh
    return PSE_STOCKS.map(stock => {
      const fluctuation = (Math.random() - 0.5) * stock.price * 0.002
      const newPrice = parseFloat((stock.price + fluctuation).toFixed(2))
      const newChange = parseFloat((newPrice - (stock.price - stock.change)).toFixed(2))
      const basePrice = stock.price - stock.change
      const newChangePct = parseFloat(((newChange / basePrice) * 100).toFixed(2))
      return { ...stock, price: newPrice, change: newChange, changePct: newChangePct }
    })
  }

  isMarketOpen(): boolean {
    const now = new Date()
    const phtOffset = 8 * 60
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
    const phtMinutes = (utcMinutes + phtOffset) % (24 * 60)
    const day = (now.getUTCDay() + (utcMinutes + phtOffset >= 24 * 60 ? 1 : 0)) % 7
    // PSE hours: Mon-Fri 09:30-15:30 PHT
    return day >= 1 && day <= 5 && phtMinutes >= 570 && phtMinutes < 930
  }
}

export const mockMarketService = new MockMarketService()
