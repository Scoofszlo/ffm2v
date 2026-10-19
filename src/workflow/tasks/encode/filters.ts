export function generateStabilizationFilter(strength: number): string {
  let filter = "vidstabtransform=";

  switch (strength) {
    case 1:
      filter += "smoothing=10:input=transforms.trf:maxangle=0.0";
      break;
    case 2:
      filter += "smoothing=15:input=transforms.trf:maxangle=0.0";
      break;
    case 3:
      filter += "smoothing=22:input=transforms.trf:maxangle=0.0";
      break;
    case 4:
      filter += "smoothing=30:input=transforms.trf:maxangle=0.0";
      break;
    case 5:
      filter += "smoothing=40:input=transforms.trf:maxangle=0.0";
      break;
    default:
      throw new Error(`Invalid stabilization strength: ${strength}`);
  }

  filter += ",";
  filter += generateUnsharpFilter();

  return filter;
}

export function generateVidstabDetectFilter(strength: number): string {
  let filter = "vidstabdetect=";

  switch (strength) {
    case 1:
      filter += "shakiness=4:accuracy=9";
      break;
    case 2:
      filter += "shakiness=6:accuracy=12";
      break;
    case 3:
      filter += "shakiness=8:accuracy=15";
      break;
    case 4:
      filter += "shakiness=10:accuracy=15";
      break;
    case 5:
      filter += "shakiness=10:accuracy=15";
      break;
    default:
      throw new Error(`Invalid stabilization strength: ${strength}`);
  }

  filter += ":result=transforms.trf";

  return filter;
}

export function generateUnsharpFilter(): string {
  return "unsharp=5:5:0.8:3:3:0.4";
}
