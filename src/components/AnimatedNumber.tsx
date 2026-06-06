import React, { useEffect, useState } from 'react';
import { animate } from 'framer-motion';

type AnimatedNumberProps = {
  value: number;
  format?: (value: number) => string;
  className?: string;
  duration?: number;
};

const defaultFormat = (value: number) => new Intl.NumberFormat('es-CL').format(Math.round(value));

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  format = defaultFormat,
  className = '',
  duration = 0.9,
}) => {
  const [displayValue, setDisplayValue] = useState(format(0));

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: 'easeOut',
      onUpdate(latest) {
        setDisplayValue(format(latest));
      },
    });

    return () => controls.stop();
  }, [duration, format, value]);

  return <span className={className}>{displayValue}</span>;
};

export default AnimatedNumber;
