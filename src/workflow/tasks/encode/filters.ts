export function generateStabilizationFilter(strength: number): string {
  switch (strength) {
    case 1:
      return "vidstabtransform=smoothing=10:input=transforms.trf:maxangle=0.0,unsharp=5:5:0.8:3:3:0.4";
    case 2:
      return "vidstabtransform=smoothing=15:input=transforms.trf:maxangle=0.0,unsharp=5:5:0.8:3:3:0.4";
    case 3:
      return "vidstabtransform=smoothing=22:input=transforms.trf:maxangle=0.0,unsharp=5:5:0.8:3:3:0.4";
    case 4:
      return "vidstabtransform=smoothing=30:input=transforms.trf:maxangle=0.0,unsharp=5:5:0.8:3:3:0.4";
    case 5:
      return "vidstabtransform=smoothing=40:input=transforms.trf:maxangle=0.0,unsharp=5:5:0.8:3:3:0.4";
    default:
      throw new Error(`Invalid stabilization strength: ${strength}`);
  }
}
