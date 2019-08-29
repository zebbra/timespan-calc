import { duration } from './mappers/duration'
import { intersector } from './mappers/intersector'
import { subtractor } from './mappers/subtractor'
import { trimmer } from './mappers/trimmer'
import { Span } from './span'

export type MapperFn<T extends Span, V extends Span> = (span: T) => V[]

export const Mappers = {
  duration,
  intersector,
  subtractor,
  trimmer
}
